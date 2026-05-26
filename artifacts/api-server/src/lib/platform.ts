/**
 * Platform configuration for non-Replit deployments.
 * Legacy Replit env vars (REPL_ID, REPLIT_DOMAINS, etc.) are supported as fallbacks.
 */

const ALLOWED_HOST_RE = /^[a-z0-9.-]+(?::\d{1,5})?$/i;
const ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i;

export function getOidcClientId(): string {
  const id =
    process.env.OIDC_CLIENT_ID?.trim() || process.env.REPL_ID?.trim();
  if (!id) {
    throw new Error(
      "OIDC_CLIENT_ID is required (legacy REPL_ID is also accepted).",
    );
  }
  return id;
}

export function getOidcIssuerUrl(): string {
  const url =
    process.env.OIDC_ISSUER_URL?.trim() ||
    process.env.ISSUER_URL?.trim();
  if (!url) {
    throw new Error(
      "OIDC_ISSUER_URL is required (legacy ISSUER_URL is also accepted).",
    );
  }
  return url;
}

/** HTTPS origin for canonical URLs, share links, and SEO (no trailing slash). */
export function getPublicOrigin(): string {
  const candidates = [
    process.env.PUBLIC_ORIGIN?.trim(),
    process.env.SEO_PUBLIC_ORIGIN?.trim(),
  ];

  for (const raw of candidates) {
    if (raw && ORIGIN_RE.test(raw)) {
      return raw.replace(/\/$/, "");
    }
  }

  const legacyDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (legacyDomain && ALLOWED_HOST_RE.test(legacyDomain)) {
    return `https://${legacyDomain}`;
  }

  const devDomain = process.env.REPLIT_DEV_DOMAIN?.trim();
  if (devDomain && ALLOWED_HOST_RE.test(devDomain)) {
    return `https://${devDomain}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:19245";
  }

  throw new Error(
    "PUBLIC_ORIGIN is required in production (SEO_PUBLIC_ORIGIN is also accepted).",
  );
}

export function getPublicHost(): string {
  try {
    return new URL(getPublicOrigin()).host;
  } catch {
    return "localhost";
  }
}

export function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  const explicit = process.env.ALLOWED_ORIGINS?.trim();
  if (explicit) {
    for (const entry of explicit.split(",")) {
      const trimmed = entry.trim();
      if (!trimmed) continue;
      if (ORIGIN_RE.test(trimmed)) {
        origins.add(trimmed.replace(/\/$/, ""));
      } else if (ALLOWED_HOST_RE.test(trimmed)) {
        origins.add(`https://${trimmed}`);
      }
    }
  }

  if (origins.size === 0) {
    const publicOrigin = getPublicOrigin();
    origins.add(publicOrigin);
    if (process.env.NODE_ENV !== "production") {
      origins.add("http://localhost:19245");
      origins.add("http://127.0.0.1:19245");
      origins.add("http://localhost:5173");
    }
  }

  const legacyDomains = process.env.REPLIT_DOMAINS;
  if (legacyDomains) {
    for (const domain of legacyDomains.split(",")) {
      const trimmed = domain.trim();
      if (trimmed) origins.add(`https://${trimmed}`);
    }
  }

  const devDomain = process.env.REPLIT_DEV_DOMAIN?.trim();
  if (devDomain) origins.add(`https://${devDomain}`);

  return origins;
}
