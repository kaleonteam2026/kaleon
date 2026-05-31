import en from "./copy/en.json";

function resolve(path: string): unknown {
  return path.split(".").reduce<unknown>((obj, key) => {
    if (obj && typeof obj === "object" && key in obj) {
      return (obj as Record<string, unknown>)[key];
    }
    return undefined;
  }, en);
}

type TOptions = Record<string, string | number> & { defaultValue?: string };

/** English UI strings (no i18n / locale switching). */
export function t(key: string, options?: TOptions): string {
  const resolved = resolve(key);
  let text =
    typeof resolved === "string"
      ? resolved
      : (options?.defaultValue ?? key);

  if (options) {
    for (const [name, value] of Object.entries(options)) {
      if (name === "defaultValue") continue;
      text = text.replace(new RegExp(`\\{\\{${name}\\}\\}`, "g"), String(value));
    }
  }

  return text;
}

export const copy = en;

export function initEnglishDocument(): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = "en";
  document.documentElement.dir = "ltr";
}
