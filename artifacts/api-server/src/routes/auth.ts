import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import { GetCurrentAuthUserResponse } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";
import { isEmailAllowed, isAllowlistEnabled } from "../lib/access-control";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

interface AttributionData {
  persona?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
}

async function upsertUser(
  claims: Record<string, unknown>,
  attribution: AttributionData = {},
) {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as
      | string
      | null,
    persona: attribution.persona ?? null,
    utmSource: attribution.utmSource ?? null,
    utmMedium: attribution.utmMedium ?? null,
    utmCampaign: attribution.utmCampaign ?? null,
    utmContent: attribution.utmContent ?? null,
  };

  // For attribution columns, only set on first insert; preserve original values on update
  // so a returning user's first-touch attribution isn't overwritten by later visits.
  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        persona: sql`coalesce(${usersTable.persona}, ${userData.persona})`,
        utmSource: sql`coalesce(${usersTable.utmSource}, ${userData.utmSource})`,
        utmMedium: sql`coalesce(${usersTable.utmMedium}, ${userData.utmMedium})`,
        utmCampaign: sql`coalesce(${usersTable.utmCampaign}, ${userData.utmCampaign})`,
        utmContent: sql`coalesce(${usersTable.utmContent}, ${userData.utmContent})`,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

const ATTRIBUTION_COOKIES = {
  persona: "attr_persona",
  utm_source: "attr_utm_source",
  utm_medium: "attr_utm_medium",
  utm_campaign: "attr_utm_campaign",
  utm_content: "attr_utm_content",
} as const;

function sanitizeAttributionValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 128);
  if (!trimmed) return null;
  // allow only safe URL-token characters
  if (!/^[\w.\-:+/]+$/.test(trimmed)) return null;
  return trimmed;
}

router.get("/auth/user", (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.json({ user: null });
    return;
  }
  res.json(
    GetCurrentAuthUserResponse.parse({ user: req.user }),
  );
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  // Capture attribution params from the login URL so we can persist them on the
  // user record after the OIDC round-trip completes.
  for (const [param, cookie] of Object.entries(ATTRIBUTION_COOKIES)) {
    const value = sanitizeAttributionValue(req.query[param]);
    if (value) setOidcCookie(res, cookie, value);
  }

  res.redirect(redirectTo.href);
});

// Query params are not validated because the OIDC provider may include
// parameters not expressed in the schema.
router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const attribution: AttributionData = {
    persona: sanitizeAttributionValue(req.cookies?.[ATTRIBUTION_COOKIES.persona]),
    utmSource: sanitizeAttributionValue(req.cookies?.[ATTRIBUTION_COOKIES.utm_source]),
    utmMedium: sanitizeAttributionValue(req.cookies?.[ATTRIBUTION_COOKIES.utm_medium]),
    utmCampaign: sanitizeAttributionValue(req.cookies?.[ATTRIBUTION_COOKIES.utm_campaign]),
    utmContent: sanitizeAttributionValue(req.cookies?.[ATTRIBUTION_COOKIES.utm_content]),
  };
  for (const cookieName of Object.values(ATTRIBUTION_COOKIES)) {
    res.clearCookie(cookieName, { path: "/" });
  }

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const claimEmail = (claims as Record<string, unknown>).email;
  if (isAllowlistEnabled() && !isEmailAllowed(typeof claimEmail === "string" ? claimEmail : null)) {
    req.log.warn({ email: claimEmail }, "Sign-in blocked by allowlist");
    await clearSession(res, getSessionId(req));
    res.status(403).type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Private Beta — DYP</title>
<style>
body{font-family:Inter,system-ui,sans-serif;background:#f4f4f5;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}
.card{max-width:480px;background:#fff;border:2px solid #0f172a;box-shadow:6px 6px 0 0 #0f172a;padding:32px}
h1{margin:0 0 8px;text-transform:uppercase;letter-spacing:-.02em;font-size:24px}
p{color:#475569;line-height:1.5;font-size:14px}
.tag{font-family:'JetBrains Mono',monospace;font-size:10px;background:#0f172a;color:#fff;padding:4px 8px;letter-spacing:.15em;display:inline-block;margin-bottom:16px}
a{display:inline-block;margin-top:16px;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#0f172a;border:2px solid #0f172a;padding:8px 14px;text-decoration:none}
a:hover{background:#0f172a;color:#fff}
</style></head>
<body><div class="card"><span class="tag">// PRIVATE BETA</span>
<h1>Access not enabled</h1>
<p>DYP is currently invite-only. Your account isn't on the allowlist yet. If you think this is a mistake, contact the app owner to be added.</p>
<a href="/api/logout">Sign out</a></div></body></html>`);
    return;
  }

  const dbUser = await upsertUser(
    claims as unknown as Record<string, unknown>,
    attribution,
  );

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const origin = getOrigin(req);

  const sid = getSessionId(req);
  await clearSession(res, sid);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

export default router;
