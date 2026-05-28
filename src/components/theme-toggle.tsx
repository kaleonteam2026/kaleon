import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs pwc-font-mono uppercase tracking-wider font-bold border transition-colors"
      style={{
        borderRadius: 6,
        borderColor: "var(--app-border-strong)",
        color: "var(--app-text-muted)",
        background: "var(--app-card-bg)",
      }}
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}
