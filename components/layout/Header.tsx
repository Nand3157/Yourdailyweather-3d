"use client";

import { motion } from "motion/react";
import { RefreshCw, Moon, Sun, Settings, CloudSun } from "lucide-react";
import LocationSearch from "../search/LocationSearch";

interface Props {
  onSearch: (l: string) => void;
  onLocate: () => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  loading: boolean;
  locating: boolean;
  refreshing: boolean;
  unit: "C" | "F";
  onUnit: (u: "C" | "F") => void;
  theme: "light" | "dark";
  onTheme: () => void;
}

/** Minimal floating header (§9). */
export default function Header(p: Props) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-40 mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-4 md:flex-row md:items-center md:gap-4"
    >
      <div className="flex items-center justify-between md:w-auto">
        <div className="flex items-center gap-2" aria-label="Atmospheric Weather home">
          <CloudSun aria-hidden className="h-7 w-7 text-amber-300" />
          <div className="leading-none">
            <p className="wordmark text-sm font-bold tracking-[0.22em]">ATMOSPHERIC</p>
            <p className="text-[11px] tracking-[0.34em] opacity-60">WEATHER</p>
          </div>
        </div>
        <button
          type="button"
          onClick={p.onOpenSettings}
          aria-label="Open settings"
          className="rounded-full p-2 transition hover:bg-white/10 active:scale-90 md:hidden"
        >
          <Settings aria-hidden className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1">
        <LocationSearch onSearch={p.onSearch} onLocate={p.onLocate} loading={p.loading} locating={p.locating} />
      </div>

      <div className="hidden items-center gap-2 md:flex" role="toolbar" aria-label="Quick actions">
        <button
          type="button"
          onClick={p.onRefresh}
          aria-label="Refresh weather"
          title="Refresh weather"
          className="rounded-full p-2.5 transition hover:-translate-y-px hover:bg-white/10 active:scale-90"
        >
          <RefreshCw aria-hidden className={`h-5 w-5 ${p.refreshing ? "animate-spin" : ""}`} />
        </button>
        <div className="glass-soft flex overflow-hidden !rounded-full p-1 text-sm" role="group" aria-label="Temperature unit">
          {(["C", "F"] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={p.unit === u}
              onClick={() => p.onUnit(u)}
              className={`rounded-full px-3 py-1 transition ${p.unit === u ? "bg-sky-400/25 font-semibold" : "opacity-60 hover:opacity-100"}`}
            >
              °{u}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={p.onTheme}
          aria-label={p.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          className="rounded-full p-2.5 transition hover:-translate-y-px hover:bg-white/10 active:scale-90"
        >
          {p.theme === "dark" ? <Moon aria-hidden className="h-5 w-5" /> : <Sun aria-hidden className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={p.onOpenSettings}
          aria-label="Open settings"
          className="rounded-full p-2.5 transition hover:bg-white/10 active:scale-90"
        >
          <Settings aria-hidden className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-2 md:hidden" role="toolbar" aria-label="Quick actions">
        <button
          type="button"
          onClick={p.onRefresh}
          aria-label="Refresh weather"
          className="glass-soft flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm transition active:scale-95"
        >
          <RefreshCw aria-hidden className={`h-4 w-4 ${p.refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
        <div className="glass-soft flex p-1 text-sm" role="group" aria-label="Temperature unit">
          {(["C", "F"] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={p.unit === u}
              onClick={() => p.onUnit(u)}
              className={`rounded-full px-3 py-1 ${p.unit === u ? "bg-sky-400/25 font-semibold" : "opacity-60"}`}
            >
              °{u}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={p.onTheme}
          aria-label="Toggle theme"
          className="glass-soft p-2.5 transition active:scale-95"
        >
          {p.theme === "dark" ? <Moon aria-hidden className="h-4 w-4" /> : <Sun aria-hidden className="h-4 w-4" />}
        </button>
      </div>
    </motion.header>
  );
}
