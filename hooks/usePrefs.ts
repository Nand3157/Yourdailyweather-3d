"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clampLevel } from "@/lib/weather/units";
import { themeBySun, type ThemePref } from "@/lib/weather/theme";

export type { ThemePref } from "@/lib/weather/theme";

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

export function useThemePref() {
  const [pref, setPref] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");
  // Refs so the resolve path never depends on state timing: prefRef is the
  // source of truth for "is the user following the sun?".
  const prefRef = useRef<ThemePref>("system");
  // Sun context of the SEARCHED LOCATION, from the loaded weather payload.
  const sunRef = useRef<{ timezone: string | null; sunrise: string | null; sunset: string | null }>({
    timezone: null,
    sunrise: null,
    sunset: null,
  });

  const resolveSystem = useCallback(
    () => themeBySun(Date.now(), sunRef.current.timezone, sunRef.current.sunrise, sunRef.current.sunset),
    []
  );

  useEffect(() => {
    const saved = read<ThemePref>("aw-theme", "system");
    prefRef.current = saved;
    setPref(saved);
    setResolved(saved === "system" ? themeBySun(Date.now(), null, null) : saved);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("light", resolved === "light");
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
  }, [resolved]);
  const change = useCallback(
    (p: ThemePref) => {
      prefRef.current = p;
      setPref(p);
      try {
        localStorage.setItem("aw-theme", JSON.stringify(p));
      } catch {}
      setResolved(p === "system" ? resolveSystem() : p);
    },
    [resolveSystem]
  );
  /** Page calls this when a location's weather loads. */
  const setSunTimes = useCallback(
    (ctx: { timezone: string; sunrise?: string; sunset?: string }) => {
      sunRef.current = {
        timezone: ctx.timezone || null,
        sunrise: ctx.sunrise ?? null,
        sunset: ctx.sunset ?? null,
      };
      // Re-resolve only when following the sun (system pref, no manual pick).
      if (prefRef.current === "system") {
        setResolved(themeBySun(Date.now(), sunRef.current.timezone, sunRef.current.sunrise, sunRef.current.sunset));
      }
    },
    []
  );
  return { pref, resolved, setPref: change, setSunTimes };
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
