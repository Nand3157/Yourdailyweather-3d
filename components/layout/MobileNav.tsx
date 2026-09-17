"use client";

import { CloudSun, Star, Settings } from "lucide-react";

/** Bottom navigation for mobile (§30). */
export default function MobileNav({
  onWeather, onFavorites, onSettings,
}: {
  onWeather: () => void;
  onFavorites: () => void;
  onSettings: () => void;
}) {
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 md:hidden">
      <div className="glass flex items-center justify-around !rounded-2xl py-2">
        <button type="button" onClick={onWeather} className="flex flex-col items-center gap-1 rounded-xl px-6 py-1.5 text-xs transition active:scale-95" aria-label="Weather">
          <CloudSun aria-hidden className="h-5 w-5" /> Weather
        </button>
        <button type="button" onClick={onFavorites} className="flex flex-col items-center gap-1 rounded-xl px-6 py-1.5 text-xs transition active:scale-95" aria-label="Favorites">
          <Star aria-hidden className="h-5 w-5" /> Favorites
        </button>
        <button type="button" onClick={onSettings} className="flex flex-col items-center gap-1 rounded-xl px-6 py-1.5 text-xs transition active:scale-95" aria-label="Settings">
          <Settings aria-hidden className="h-5 w-5" /> Settings
        </button>
      </div>
    </nav>
  );
}
