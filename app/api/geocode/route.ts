import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  q: z.string().trim().min(2).max(80),
});

const resultSchema = z.array(
  z.object({
    name: z.string(),
    country: z.string().optional(),
    country_code: z.string().optional(),
    admin1: z.string().optional(),
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.string().optional(),
    population: z.number().optional(),
  })
);

export type GeoSuggestion = z.infer<(typeof resultSchema)>[number];

/** Tiny in-memory cache: identical prefix spam from typing shouldn't rehit upstream. */
const mem = new Map<string, { at: number; results: GeoSuggestion[] }>();
const MEM_TTL_MS = 60 * 60 * 1000; // 1 hour — geocoding data is static
const MEM_CAP = 500;

function memGet(k: string): GeoSuggestion[] | null {
  const hit = mem.get(k);
  if (hit && Date.now() - hit.at < MEM_TTL_MS) return hit.results;
  mem.delete(k);
  return null;
}

function memSet(k: string, results: GeoSuggestion[]) {
  if (mem.size >= MEM_CAP) {
    const oldest = mem.keys().next().value;
    if (oldest !== undefined) mem.delete(oldest);
  }
  mem.set(k, { at: Date.now(), results });
}

/** Shared rate-limit budget with the weather route cadence (tighter: cheap lookups). */
const hits = new Map<string, number[]>();
const RATE_LIMIT_MAX = 60;
const RATE_WINDOW_MS = 60_000;
const TRUST_PROXY = process.env.VERCEL === "1";

function clientKey(req: NextRequest): string {
  if (TRUST_PROXY) {
    const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (fwd) return fwd;
  }
  return "global";
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const fresh = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  fresh.push(now);
  hits.set(key, fresh);
  return fresh.length > RATE_LIMIT_MAX;
}

export async function GET(req: NextRequest) {
  if (rateLimited(clientKey(req))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment.", results: [] }, { status: 429 });
  }

  const parsed = querySchema.safeParse({ q: req.nextUrl.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide ?q=<location name> (2-80 chars).", results: [] }, { status: 400 });
  }

  const q = parsed.data.q;
  const cacheKey = q.toLowerCase();
  const cached = memGet(cacheKey);
  if (cached) {
    return NextResponse.json({ results: cached }, { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=7200" } });
  }

  const upstreamUrl =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(q)}&count=6&language=en&format=json`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
  } catch {
    return NextResponse.json({ error: "Location search is unreachable.", results: [] }, { status: 503 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: "Location search failed.", results: [] }, { status: 502 });
  }

  let body: { results?: unknown };
  try {
    body = (await upstream.json()) as { results?: unknown };
  } catch {
    return NextResponse.json({ error: "Unexpected response from location search.", results: [] }, { status: 502 });
  }

  const parsedResults = resultSchema.safeParse(body.results ?? []);
  const results: GeoSuggestion[] = parsedResults.success ? parsedResults.data : [];

  memSet(cacheKey, results);
  return NextResponse.json({ results }, { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=7200" } });
}
