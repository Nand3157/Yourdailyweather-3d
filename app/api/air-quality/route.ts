import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

const CURRENT_FIELDS = [
  "us_aqi", "pm2_5", "pm10", "ozone",
  "nitrogen_dioxide", "sulphur_dioxide", "carbon_monoxide",
].join(",");

const responseSchema = z.object({
  current: z
    .object({
      us_aqi: z.number().nullable().optional(),
      pm2_5: z.number().nullable().optional(),
      pm10: z.number().nullable().optional(),
      ozone: z.number().nullable().optional(),
      nitrogen_dioxide: z.number().nullable().optional(),
      sulphur_dioxide: z.number().nullable().optional(),
      carbon_monoxide: z.number().nullable().optional(),
    })
    .optional(),
});

export type AirQualityPayload = z.infer<typeof responseSchema>;

/** Tiny memory cache — AQI updates hourly upstream; 10 min is plenty fresh. */
const mem = new Map<string, { at: number; data: AirQualityPayload }>();
const MEM_TTL_MS = 10 * 60 * 1000;
const MEM_CAP = 500;

function memGet(k: string): AirQualityPayload | null {
  const hit = mem.get(k);
  if (hit && Date.now() - hit.at < MEM_TTL_MS) return hit.data;
  mem.delete(k);
  return null;
}

function memSet(k: string, data: AirQualityPayload) {
  if (mem.size >= MEM_CAP) {
    const oldest = mem.keys().next().value;
    if (oldest !== undefined) mem.delete(oldest);
  }
  mem.set(k, { at: Date.now(), data });
}

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

function rounded(n: number | undefined | null): number | undefined {
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n * 10) / 10 : undefined;
}

export async function GET(req: NextRequest) {
  if (rateLimited(clientKey(req))) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const parsed = querySchema.safeParse({
    lat: req.nextUrl.searchParams.get("lat") ?? undefined,
    lon: req.nextUrl.searchParams.get("lon") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide ?lat=..&lon=.." }, { status: 400 });
  }
  const { lat, lon } = parsed.data;

  // Open-Meteo returns ~2 decimals; cache key on the rounded cell so nearby
  // requests share entries.
  const cell = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = memGet(cell);
  if (cached) return NextResponse.json(cached);

  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${encodeURIComponent(String(lat))}&longitude=${encodeURIComponent(String(lon))}` +
    `&current=${CURRENT_FIELDS}&timezone=auto`;

  let upstream: Response;
  try {
    upstream = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(6000) });
  } catch {
    return NextResponse.json({ error: "Air quality service is unreachable." }, { status: 503 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: "Air quality lookup failed." }, { status: 502 });
  }

  let body: unknown;
  try {
    body = await upstream.json();
  } catch {
    return NextResponse.json({ error: "Unexpected response from air quality service." }, { status: 502 });
  }

  const parsedBody = responseSchema.safeParse(body);
  if (!parsedBody.success || !parsedBody.data.current) {
    return NextResponse.json({ error: "Air quality unavailable for this location." }, { status: 404 });
  }

  const c = parsedBody.data.current;
  const payload: AirQualityPayload = {
    current: {
      us_aqi: rounded(c.us_aqi),
      pm2_5: rounded(c.pm2_5),
      pm10: rounded(c.pm10),
      ozone: rounded(c.ozone),
      nitrogen_dioxide: rounded(c.nitrogen_dioxide),
      sulphur_dioxide: rounded(c.sulphur_dioxide),
      carbon_monoxide: rounded(c.carbon_monoxide),
    },
  };

  memSet(cell, payload);
  return NextResponse.json(payload);
}
