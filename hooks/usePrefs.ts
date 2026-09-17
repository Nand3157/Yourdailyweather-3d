"use client";

import { useCallback, useEffect, useState } from "react";
import { clampLevel } from "@/lib/weather/units";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    setFavorites(read<string[]>("aw-favorites", []));
  }, []);
  const toggle = useCallback((name: string) => {
    setFavorites((favs) => {
      const next = favs.includes(name) ? favs.filter((f) => f !== name) : [...favs, name].slice(0, 12);
      try {
        localStorage.setItem("aw-favorites", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  return { favorites, toggle };
}

export function useUnit() {
  const [unit, setUnit] = useState<"C" | "F">("C");
  useEffect(() => {
    setUnit(read<"C" | "F">("aw-unit", "C"));
  }, []);
  const change = useCallback((u: "C" | "F") => {
    setUnit(u);
    try {
      localStorage.setItem("aw-unit", JSON.stringify(u));
    } catch {}
  }, []);
  return { unit, setUnit: change };
}

export type ThemePref = "system" | "light" | "dark";

export function useThemePref() {
  const [pref, setPref] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");
  useEffect(() => {
    const saved = read<ThemePref>("aw-theme", "system");
    setPref(saved);
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => setResolved(saved === "system" ? (mq.matches ? "light" : "dark") : saved);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("light", resolved === "light");
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);
  const change = useCallback((p: ThemePref) => {
    setPref(p);
    try {
      localStorage.setItem("aw-theme", JSON.stringify(p));
    } catch {}
    if (p !== "system") setResolved(p);
    else setResolved(window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }, []);
  return { pref, resolved, setPref: change };
}

export function useEffectsPref() {
  const [effects, setEffects] = useState<"full" | "reduced" | "off">("full");
  useEffect(() => {
    setEffects(read<"full" | "reduced" | "off">("aw-effects", "full"));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setEffects("reduced");
  }, []);
  const change = useCallback((e: "full" | "reduced" | "off") => {
    setEffects(e);
    try {
      localStorage.setItem("aw-effects", JSON.stringify(e));
    } catch {}
  }, []);
  return { effects, setEffects: change };
}

export function useIntensity() {
  const [level, setLevel] = useState(1);
  useEffect(() => {
    const raw = read<number>("aw-intensity", 1);
    setLevel(clampLevel(typeof raw === "number" ? raw : 1));
  }, []);
  const change = useCallback((v: number) => {
    const c = clampLevel(v);
    setLevel(c);
    try {
      localStorage.setItem("aw-intensity", JSON.stringify(c));
    } catch {}
  }, []);
  return { level, setLevel: change };
}
