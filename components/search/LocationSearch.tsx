"use client";

import { useState } from "react";
import { Search, X, LocateFixed } from "lucide-react";

interface Props {
  onSearch: (location: string) => void;
  onLocate: () => void;
  loading: boolean;
  locating: boolean;
}

/** Premium debounced search: Enter submits, Esc clears, arrows navigate (§6). */
export default function LocationSearch({ onSearch, onLocate, loading, locating }: Props) {
  const [value, setValue] = useState("");
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const examples = ["Ahmedabad", "Mumbai", "London", "New York", "Tokyo", "Dubai"];

  const submit = (v = value) => {
    const q = v.trim();
    if (q) onSearch(q);
    setActive(-1);
  };

  return (
    <div className="relative w-full">
      <div
        role="search"
        className="glass-soft flex items-center gap-2 px-4 py-2.5 transition-shadow focus-within:shadow-[0_0_0_3px_rgba(125,211,252,0.35)]"
      >
        {loading ? (
          <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <Search aria-hidden className="h-5 w-5 shrink-0 opacity-60" />
        )}
        <label htmlFor="location-search" className="sr-only">
          Search city, location or postcode
        </label>
        <input
          id="location-search"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            // Ignore blur-to-inside (e.g. clicking an example city).
            if (!e.currentTarget.closest(".relative")?.contains(e.relatedTarget as Node)) setFocused(false);
          }}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(active >= 0 ? examples[active] : value);
            else if (e.key === "Escape") {
              if (value) {
                setValue("");
              } else {
                setFocused(false);
                e.currentTarget.blur();
              }
              setActive(-1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % examples.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + examples.length) % examples.length);
            }
          }}
          placeholder="Search city or location"
          className="w-full min-w-0 bg-transparent text-[15px] placeholder:text-current placeholder:opacity-55 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setValue("")}
            className="rounded-full p-1 transition hover:bg-white/10 active:scale-90"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onLocate}
          aria-label="Use my location"
          title="Use my location"
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm transition hover:-translate-y-px hover:bg-white/20 active:scale-95"
        >
          <LocateFixed aria-hidden className={`h-4 w-4 ${locating ? "animate-pulse" : ""}`} />
          <span className="hidden sm:inline">Use my location</span>
        </button>
      </div>
      {focused && (
        <div
          role="listbox"
          aria-label="Example locations"
          className="glass-sheet absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl p-2 shadow-xl"
        >
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider opacity-50">
            Try a city
          </p>
          <ul className="max-h-64 overflow-y-auto">
            {examples.map((ex, i) => (
              <li key={ex}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active === i}
                  onClick={() => submit(ex)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${
                    active === i ? "bg-sky-400/20" : "hover:bg-white/5"
                  }`}
                >
                  <Search aria-hidden className="h-3.5 w-3.5 shrink-0 opacity-40" />
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
