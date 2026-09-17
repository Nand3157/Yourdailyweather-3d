import type { WeatherResponse } from "./types";

const TTL_MS = 5 * 60 * 1000; // §33
const mem = new Map<string, { data: WeatherResponse; at: number }>();

function store() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem("aw-cache-v1");
    return raw ? (JSON.parse(raw) as Record<string, { data: WeatherResponse; at: number }>) : {};
  } catch {
    return {};
  }
}

export function cacheKey(location: string): string {
  return location.trim().toLowerCase();
}

export function getCached(location: string): WeatherResponse | null {
  const key = cacheKey(location);
  const hit = mem.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  const disk = store();
  const entry = disk?.[key];
  if (entry && Date.now() - entry.at < TTL_MS) {
    mem.set(key, entry);
    return entry.data;
  }
  return null;
}

export function setCached(location: string, data: WeatherResponse): void {
  const key = cacheKey(location);
  const entry = { data, at: Date.now() };
  mem.set(key, entry);
  try {
    const disk = store() ?? {};
    disk[key] = entry;
    localStorage.setItem("aw-cache-v1", JSON.stringify(disk));
  } catch {
    /* storage full/blocked — memory cache still works */
  }
}

/** Most recent data regardless of age (offline fallback). */
export function getStale(location: string): WeatherResponse | null {
  const key = cacheKey(location);
  const hit = mem.get(key);
  if (hit) return hit.data;
  try {
    const disk = store();
    return disk?.[key]?.data ?? null;
  } catch {
    return null;
  }
}
