import i18n from "./config";

const HEADER = "x-dyp-locale";

let installed = false;

/** Patches global fetch so every same-origin request carries the user's locale.
 * Runs once at app start. Safe to call multiple times. */
export function installLocaleFetch(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : (input as Request).url;
      const isApi = url.startsWith("/api") || url.includes("/api/");
      if (!isApi) return original(input, init);
      const locale = (i18n.language || "en").split("-")[0];
      const headers = new Headers(init?.headers ?? (typeof input !== "string" && !(input instanceof URL) ? (input as Request).headers : undefined));
      if (!headers.has(HEADER)) headers.set(HEADER, locale);
      return original(input, { ...init, headers });
    } catch {
      return original(input, init);
    }
  };
}
