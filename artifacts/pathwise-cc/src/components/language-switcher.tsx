import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  setStoredLocale,
  type SupportedLocale,
} from "@/i18n/config";

interface Props {
  variant?: "dark" | "light";
  className?: string;
}

export default function LanguageSwitcher({ variant = "light", className }: Props) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = (i18n.language?.split("-")[0] ?? "en") as SupportedLocale;
  const safeCurrent = (SUPPORTED_LOCALES as readonly string[]).includes(current) ? current : "en";
  const meta = LOCALE_LABELS[safeCurrent];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const choose = async (loc: SupportedLocale) => {
    setStoredLocale(loc);
    await i18n.changeLanguage(loc);
    setOpen(false);
  };

  const isDark = variant === "dark";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label={t("common.selectLanguage")}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1.5 text-xs pwc-font-mono uppercase tracking-wider font-bold border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1",
          isDark
            ? "border-white text-white hover:bg-white hover:text-slate-900 focus:ring-white"
            : "border-slate-900 text-slate-900 bg-white hover:bg-slate-900 hover:text-white focus:ring-slate-900"
        )}
        data-testid="language-switcher"
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        <span aria-hidden="true">{meta.flag}</span>
        <span className="hidden sm:inline">{safeCurrent.toUpperCase()}</span>
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("common.selectLanguage")}
          className="absolute right-0 mt-1 z-[60] min-w-[180px] bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] py-1"
        >
          {SUPPORTED_LOCALES.map(loc => {
            const m = LOCALE_LABELS[loc];
            const active = loc === safeCurrent;
            return (
              <li key={loc}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => void choose(loc)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors min-h-[36px]",
                    active ? "bg-slate-900 text-white" : "text-slate-900 hover:bg-slate-100"
                  )}
                >
                  <span aria-hidden="true">{m.flag}</span>
                  <span className="flex-1 font-semibold">{m.native}</span>
                  {active && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
