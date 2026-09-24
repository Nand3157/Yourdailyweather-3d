import { z } from "zod";
import type { WeatherResponse } from "./types";

const TTL_MS = 5 * 60 * 1000; // §33
const mem = new Map<string, { data: WeatherResponse; at: number }>();

// localStorage is same-origin but unvalidated by nature — parse defensively
// so a corrupt/foreign entry can never reach the render tree.
const cachedEntry = z.object({
  at: z.number(),
  data: z.object({
    location: z.object({ name: z.string() }).passthrough(),
    current: z.object({ temperature: z.number() }).passthrough(),
    previous24Hours: z.array(z.object({ timestamp: z.number() }).passthrough()),
    next24Hours: z.array(z.object({ timestamp: z.number() }).passthrough()),
  }).passthrough(),
});

type CacheEntry = { data: WeatherResponse; at: number };

function store(): Record<string, CacheEntry> {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem("aw-cache-v1");
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, CacheEntry> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const ok = cachedEntry.safeParse(v);
      if (ok.success) out[k] = v as CacheEntry;
      // malformed entries are silently dropped
    }
    return out;
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
