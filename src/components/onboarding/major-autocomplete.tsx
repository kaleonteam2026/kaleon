import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLLEGE_MAJORS } from "./majors";

interface MajorAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function MajorAutocomplete({ value, onChange, placeholder, className }: MajorAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const q = inputValue.toLowerCase().trim();
    if (!q) return COLLEGE_MAJORS.slice(0, 25);
    return COLLEGE_MAJORS.filter(m =>
      m.toLowerCase().includes(q)
    );
  }, [inputValue]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIndex(-1);
  }, [filtered.length]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const selectMajor = (major: string) => {
    setInputValue(major);
    onChange(major);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    onChange(val);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex(prev => (prev <= 0 ? filtered.length - 1 : prev - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          selectMajor(filtered[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#4ECCA3", opacity: 0.6 }} />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full pl-9 pr-3 py-2.5 rounded-xl text-sm",
            "text-[var(--app-input-text)] placeholder:text-[var(--app-input-placeholder)]",
            "bg-[var(--app-input-bg)] border border-[var(--app-border-strong)]",
            "focus:outline-none focus:ring-2 focus:ring-[#4ECCA3]/40 focus:border-[#4ECCA3]",
            className,
          )}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls="major-listbox"
          aria-activedescendant={activeIndex >= 0 ? `major-option-${activeIndex}` : undefined}
        />
      </div>

      {open && (
        <ul
          ref={listRef}
          id="major-listbox"
          role="listbox"
          className="absolute z-[100] mt-1 w-full max-h-56 overflow-y-auto rounded-xl border shadow-2xl"
          style={{
            background: "#0d1a2e",
            borderColor: "rgba(78,204,163,0.35)",
          }}
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-xs text-center" style={{ color: "#64748b" }}>
              No majors match — you can type your major name
            </li>
          ) : (
            filtered.map((major, i) => {
              const selected = major === inputValue;
              return (
                <li
                  key={major}
                  id={`major-option-${i}`}
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectMajor(major)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer transition-colors",
                    activeIndex === i
                      ? "bg-[rgba(78,204,163,0.15)]"
                      : "hover:bg-[rgba(78,204,163,0.08)]",
                  )}
                  style={{ color: activeIndex === i ? "#4ECCA3" : "#e2e8f0" }}
                >
                  <span className="flex-1">{major}</span>
                  {selected && (
                    <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "#4ECCA3" }} />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
