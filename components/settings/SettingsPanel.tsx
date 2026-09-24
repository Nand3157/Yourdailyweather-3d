"use client";

import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import type { ThemePref } from "@/hooks/usePrefs";

interface Props {
  open: boolean;
  onClose: () => void;
  theme: ThemePref;
  onTheme: (t: ThemePref) => void;
  unit: "C" | "F";
  onUnit: (u: "C" | "F") => void;
  effects: "full" | "reduced" | "off";
  onEffects: (e: "full" | "reduced" | "off") => void;
  level: number;
  onLevel: (v: number) => void;
}

/** Slide-over settings panel (§50). */
export default function SettingsPanel(p: Props) {
  return (
    <AnimatePresence>
      {p.open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={p.onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="glass-sheet fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col !rounded-none border-y-0 border-r-0 p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Settings</h2>
              <button type="button" onClick={p.onClose} aria-label="Close settings" className="rounded-full p-2 transition hover:bg-white/10 active:scale-90">
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto">
              <fieldset>
                <legend className="mb-2 text-sm uppercase tracking-widest opacity-60">Appearance</legend>
                <div className="flex gap-2" role="radiogroup" aria-label="Appearance">
                  {(["system", "light", "dark"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={p.theme === t}
                      onClick={() => p.onTheme(t)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm capitalize transition active:scale-95 ${p.theme === t ? "border-sky-300/60 bg-sky-400/20" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm uppercase tracking-widest opacity-60">Temperature</legend>
                <div className="flex gap-2" role="radiogroup" aria-label="Temperature unit">
                  {(["C", "F"] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      role="radio"
                      aria-checked={p.unit === u}
                      onClick={() => p.onUnit(u)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm transition active:scale-95 ${p.unit === u ? "border-sky-300/60 bg-sky-400/20" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                    >
                      °{u} {u === "C" ? "Celsius" : "Fahrenheit"}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm uppercase tracking-widest opacity-60">Visual effects</legend>
                <div className="flex gap-2" role="radiogroup" aria-label="Visual effects">
                  {(["full", "reduced", "off"] as const).map((e) => (
                    <button
                      key={e}
                      type="button"
                      role="radio"
                      aria-checked={p.effects === e}
                      onClick={() => p.onEffects(e)}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm capitalize transition active:scale-95 ${p.effects === e ? "border-sky-300/60 bg-sky-400/20" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                    >
                      {e === "full" ? "Full 3D" : e === "reduced" ? "Reduced" : "Off"}
                    </button>
                  ))}
                </div>
                <p className="text-soft mt-2 text-xs">Full enables the 3D atmosphere on capable devices. Reduced uses fewer particles. Off uses CSS only.</p>
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm uppercase tracking-widest opacity-60">
                  Atmosphere intensity · {Math.round(p.level * 100)}%
                </legend>
                <label htmlFor="aw-intensity" className="sr-only">Atmosphere intensity</label>
                <input
                  id="aw-intensity"
                  type="range"
                  min={0.3}
                  max={1.6}
                  step={0.1}
                  value={p.level}
                  onChange={(e) => p.onLevel(parseFloat(e.target.value))}
                  className="w-full accent-sky-400"
                />
                <p className="text-soft mt-1 text-xs">Dial the storm, snowfall and glow up or down.</p>
              </fieldset>

              <p className="text-soft text-xs leading-relaxed">
                Weather data powered by Visual Crossing. Favorites, units and theme are stored only on this device.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
