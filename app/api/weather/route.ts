import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { transformVc } from "@/lib/weather/transform";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  location: z.string().trim().min(1).max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
});

const ELEMENTS = [
  "datetime", "datetimeEpoch", "temp", "feelslike", "humidity", "precip", "precipprob",
  "preciptype", "windspeed", "winddir", "windgust", "visibility", "cloudcover", "uvindex",
  "conditions", "description", "icon", "pressure", "dew", "solarradiation", "sunrise", "sunset",
  "sunriseEpoch", "sunsetEpoch",
].join(",");

/** Tiny in-memory rate limiter (per-instance; Vercel-safe best effort). */
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 30; // 30 req/min/IP
}

function suggestions(): string[] {
  return ["Ahmedabad", "Mumbai", "London", "Tokyo", "New York"];
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment.", suggestions: suggestions() }, { status: 429 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters.", suggestions: suggestions() }, { status: 400 });
  }
  const { location, lat, lon } = parsed.data;
  const query = location ?? (lat !== undefined && lon !== undefined ? `${lat},${lon}` : null);
  if (!query) {
    return NextResponse.json({ error: "Provide ?location=City or ?lat=..&lon=..", suggestions: suggestions() }, { status: 400 });
  }

  const key = process.env.VISUAL_CROSSING_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Weather service is not configured.", suggestions: suggestions() }, { status: 500 });
    }
    const { demoResponse } = await import("@/lib/weather/demo");
    return NextResponse.json(demoResponse(query), { headers: { "x-weather-demo": "1" } });
  }

  const today = new Date();
  const start = new Date(today.getTime() - 2 * 86400000).toISOString().slice(0, 10);
  const end = new Date(today.getTime() + 3 * 86400000).toISOString().slice(0, 10);
  const url =
    `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/` +
    `${encodeURIComponent(query)}/${start}/${end}` +
    `?unitGroup=metric&include=current,days,hours&elements=${ELEMENTS}&contentType=json&key=${encodeURIComponent(key)}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, { next: { revalidate: 300 } });
  } catch {
    return NextResponse.json(
      { error: "You're offline or the weather service is unreachable.", suggestions: suggestions() },
      { status: 503 }
    );
  }

  if (upstream.status === 400 || upstream.status === 404) {
    return NextResponse.json(
      { error: `We couldn't find "${query}". Try one of these:`, suggestions: suggestions() },
      { status: 404 }
    );
  }
  if (upstream.status === 401 || upstream.status === 403) {
    return NextResponse.json({ error: "Weather service refused the request.", suggestions: suggestions() }, { status: 502 });
  }
  if (upstream.status === 429) {
    return NextResponse.json({ error: "Weather API quota exceeded. Please try again later.", suggestions: suggestions() }, { status: 429 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: "Weather service is temporarily unavailable.", suggestions: suggestions() }, { status: 502 });
  }

  try {
    const json = await upstream.json();
    const shaped = transformVc(json);
    return NextResponse.json(shaped, { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch {
    return NextResponse.json({ error: "Received an unexpected response from the weather service.", suggestions: suggestions() }, { status: 502 });
  }
}
