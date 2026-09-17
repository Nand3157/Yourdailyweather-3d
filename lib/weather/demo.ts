import type { WeatherResponse } from "./types";

/** Realistic dev/demo fallback ONLY when no API key is configured (§60). */
export function demoResponse(query: string): WeatherResponse {
  const now = Math.floor(Date.now() / 3600000) * 3600;
  const hours = Array.from({ length: 72 }, (_, i) => {
    const t = now - 36 * 3600 + i * 3600;
    const dayCurve = Math.sin(((i % 24) / 24) * Math.PI * 2 - Math.PI / 2) * 4;
    return {
      timestamp: t,
      temperature: Math.round((29 + dayCurve) * 10) / 10,
      feelsLike: Math.round((31 + dayCurve) * 10) / 10,
      precipitationProbability: i % 24 >= 16 && i % 24 <= 20 ? 55 : 8,
      precipitation: 0,
      windSpeed: 14 + (i % 5),
      windDirection: 300 + (i % 20),
      conditions: i % 24 >= 16 && i % 24 <= 20 ? "Rain" : "Partly cloudy",
      icon: i % 24 >= 16 && i % 24 <= 20 ? "rain" : "partly-cloudy-day",
      humidity: 68,
      cloudCover: 45,
    };
  });
  const anchor = hours.findIndex((h) => h.timestamp >= Math.floor(Date.now() / 1000));
  return {
    location: { name: query || "Ahmedabad", country: "India", latitude: 23.0225, longitude: 72.5714, timezone: "Asia/Kolkata" },
    current: {
      temperature: 28,
      feelsLike: 30,
      humidity: 74,
      windSpeed: 18,
      windDirection: 315,
      precipitationProbability: 42,
      precipitation: 0,
      conditions: "Partly Cloudy",
      description: "Partly cloudy skies. A warm afternoon.",
      uvIndex: 6,
      visibility: 10,
      cloudCover: 45,
      pressure: 1008,
      dew: 22,
      sunrise: "06:32",
      sunset: "18:55",
      icon: "partly-cloudy-day",
      datetimeEpoch: Math.floor(Date.now() / 1000),
    },
    previous24Hours: hours.slice(Math.max(0, anchor - 24), anchor).map((h) => ({ ...h, isPast: true })),
    next24Hours: hours.slice(anchor, anchor + 24).map((h) => ({ ...h, isPast: false })),
    sunrise: "06:32",
    sunset: "18:55",
    timezone: "Asia/Kolkata",
    updatedAt: Date.now(),
    demo: true,
  };
}
