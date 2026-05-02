function parseList(env: string | undefined): string[] {
  if (!env) return [];
  return env
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const ALLOWED_EMAILS = parseList(process.env.ALLOWED_EMAILS);
const ALLOWED_DOMAINS = parseList(process.env.ALLOWED_EMAIL_DOMAINS);

export function isAllowlistEnabled(): boolean {
  return ALLOWED_EMAILS.length > 0 || ALLOWED_DOMAINS.length > 0;
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!isAllowlistEnabled()) return true;
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (ALLOWED_EMAILS.includes(normalized)) return true;
  const domain = normalized.split("@")[1];
  if (domain && ALLOWED_DOMAINS.includes(domain)) return true;
  return false;
}
