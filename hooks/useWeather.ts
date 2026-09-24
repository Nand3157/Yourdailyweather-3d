"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WeatherResponse } from "@/lib/weather/types";
import { fetchWeather, WeatherApiError } from "@/lib/weather/api";

interface State {
  data: WeatherResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: { message: string; suggestions: string[] } | null;
  location: string;
  updatedAgo: string;
}

const FALLBACK = "Ahmedabad, India";

export function useWeather() {
  const [state, setState] = useState<State>({ data: null, loading: true, refreshing: false, error: null, location: FALLBACK, updatedAgo: "" });
  const [usingGeo, setUsingGeo] = useState(false);
  const locRef = useRef(FALLBACK);

  const safeGet = (k: string): string | null => {
    try {
      if (typeof window === "undefined" || typeof localStorage === "undefined") return null;
      const v = localStorage.getItem(k);
      return typeof v === "string" ? v : null;
    } catch {
      return null;
    }
  };

  const load = useCallback(async (loc: string, opts?: { force?: boolean; silent?: boolean }) => {
    locRef.current = loc;
    setState((s) => ({ ...s, location: loc, loading: !s.data && !opts?.silent, refreshing: !!s.data || !!opts?.force, error: null }));
    try {
      const data = await fetchWeather(loc, { force: opts?.force });
      setState((s) => ({ ...s, data, loading: false, refreshing: false, updatedAgo: "just now" }));
    } catch (e) {
      const err = e as WeatherApiError;
      setState((s) => ({ ...s, loading: false, refreshing: false, error: { message: err.message, suggestions: err.suggestions ?? [] } }));
    }
  }, []);

  const refresh = useCallback(() => load(locRef.current, { force: true }), [load]);

  // Initial: geolocate, else fallback (§7). Never nag.
  // NOTE: no mount-ref guard here — StrictMode intentionally double-invokes
  // effects, and each run must own its own fallback timer (cleanup cancels it).
  useEffect(() => {
    if (safeGet("aw-geo") === "1") setUsingGeo(true);
    let cancelled = false;
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) void load(FALLBACK);
    }, 2500);
    if (typeof navigator !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          clearTimeout(fallbackTimer);
          try {
            localStorage.setItem("aw-geo", "1");
          } catch {}
          setUsingGeo(true);
          void load(`${pos.coords.latitude.toFixed(3)},${pos.coords.longitude.toFixed(3)}`);
        },
        () => {
          if (cancelled) return;
          clearTimeout(fallbackTimer);
          void load(FALLBACK);
        },
        { timeout: 8000, maximumAge: 600000 }
      );
    }
    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [load]);

  // "Updated x ago" ticker (§22/55).
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        if (!s.data) return s;
        const mins = Math.floor((Date.now() - s.data.updatedAt) / 60000);
        return { ...s, updatedAgo: mins < 1 ? "just now" : mins === 1 ? "1 min ago" : `${mins} min ago` };
      });
    }, 15000);
    return () => clearInterval(id);
  }, []);

  return { ...state, load, refresh, usingGeo };
}
