"use client";

import { motion } from "motion/react";
import { Star } from "lucide-react";

/** Saved locations in localStorage (§21). */
export default function FavoriteLocations({
  favorites, current, onSelect,
}: {
  favorites: string[];
  current: string;
  onSelect: (l: string) => void;
}) {
  if (!favorites.length) return null;
  return (
    <section aria-label="Favorite locations" className="mx-auto w-full max-w-6xl px-4 pt-6">
      <div className="glass p-4 md:p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] opacity-70">
          <Star aria-hidden className="h-4 w-4 fill-amber-300 text-amber-300" /> Favorites
        </h2>
        <ul className="flex flex-wrap gap-2">
          {favorites.map((f) => (
            <motion.li key={f} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <button
                type="button"
                onClick={() => onSelect(f)}
                aria-label={`Load weather for ${f}`}
                className={`rounded-full border px-4 py-2 text-sm transition hover:-translate-y-px active:scale-95 ${
                  f === current ? "border-sky-300/60 bg-sky-400/20" : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                ★ {f}
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
