"use client";

import type { WeatherResponse } from "./types";
import { getCached, setCached, getStale } from "./cache";

export class WeatherApiError extends Error {
  status: number;
  suggestions: string[];
  constructor(message: string, status = 500, suggestions: string[] = []) {
    super(message);
    this.status = status;
    this.suggestions = suggestions;
  }
}

/** Frontend → same-origin proxy only. The VC key never touches the browser (§34/51). */
export async function fetchWeather(location: string, opts?: { force?: boolean }): Promise<WeatherResponse> {
  const q = location.trim();
  if (!q) throw new WeatherApiError("Enter a city, address or postcode.", 400);

  // `?scene=` (demo mode only) travels through to the proxy for scene previews.
  // Scene payloads bypass the cache entirely so scene switching is always live.
  const scene = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("scene") : null;
  const qs = scene ? `&scene=${encodeURIComponent(scene)}` : "";

  if (!opts?.force && !scene) {
    const hit = getCached(q);
    if (hit) {
      // Refresh silently in the background; caller keeps instant UI.
      void refreshInBackground(q);
      return hit;
    }
  }

  let res: Response;
  try {
    // Never leave the user on an endless skeleton: give up after 12s.
    res = await fetch(`/api/weather?location=${encodeURIComponent(q)}${qs}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
  } catch (e) {
    const stale = getStale(q);
    if (stale) return stale;
    throw new WeatherApiError(
      "The request timed out. Check your connection, then refresh.",
      0,
      ["Ahmedabad", "Mumbai", "London", "Tokyo", "New York"]
    );
  }
  if (!res.ok) {
    const stale = getStale(q);
    if (stale) return stale;
    let body: { error?: string; suggestions?: string[] } = {};
    try {
      body = await res.json();
    } catch {
      /* non-JSON error */
    }
    throw new WeatherApiError(body.error ?? "Weather request failed.", res.status, body.suggestions ?? []);
  }
  const data = (await res.json()) as WeatherResponse;
  if (!scene) setCached(q, data);
  return data;
}

async function refreshInBackground(q: string) {
  try {
    const res = await fetch(`/api/weather?location=${encodeURIComponent(q)}`, { cache: "no-store" });
    if (res.ok) setCached(q, (await res.json()) as WeatherResponse);
  } catch {
    /* silent */
  }
}
