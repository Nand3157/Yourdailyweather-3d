import { z } from "zod";
import type { CurrentWeather, HourlyWeather, WeatherResponse } from "./types";

/** Minimal VC Timeline shape — only fields we request (§4). */
const vcHour = z
  .object({
    datetime: z.string(),
    datetimeEpoch: z.number(),
    temp: z.number(),
    feelslike: z.number().nullable().optional(),
    humidity: z.number().nullable().optional(),
    precip: z.number().nullable().optional(),
    precipprob: z.number().nullable().optional(),
    windspeed: z.number().nullable().optional(),
    winddir: z.number().nullable().optional(),
    conditions: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    cloudcover: z.number().nullable().optional(),
  })
  .passthrough();

const vcDay = z
  .object({
    datetime: z.string(),
    datetimeEpoch: z.number().optional(),
    temp: z.number().optional(),
    feelslike: z.number().nullable().optional(),
    humidity: z.number().nullable().optional(),
    precip: z.number().nullable().optional(),
    precipprob: z.number().nullable().optional(),
    windspeed: z.number().nullable().optional(),
    winddir: z.number().nullable().optional(),
    visibility: z.number().nullable().optional(),
    cloudcover: z.number().nullable().optional(),
    uvindex: z.number().nullable().optional(),
    conditions: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    pressure: z.number().nullable().optional(),
    dew: z.number().nullable().optional(),
    sunrise: z.string().nullable().optional(),
    sunset: z.string().nullable().optional(),
    sunriseEpoch: z.number().nullable().optional(),
    sunsetEpoch: z.number().nullable().optional(),
    hours: z.array(vcHour).optional(),
  })
  .passthrough();

export const vcResponse = z
  .object({
    resolvedAddress: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    timezone: z.string(),
    tzoffset: z.number().optional(),
    currentConditions: z
      .object({
        datetime: z.string().optional(),
        datetimeEpoch: z.number().optional(),
        temp: z.number().nullable().optional(),
        feelslike: z.number().nullable().optional(),
        humidity: z.number().nullable().optional(),
        precip: z.number().nullable().optional(),
        precipprob: z.number().nullable().optional(),
        windspeed: z.number().nullable().optional(),
        winddir: z.number().nullable().optional(),
        visibility: z.number().nullable().optional(),
        cloudcover: z.number().nullable().optional(),
        uvindex: z.number().nullable().optional(),
        conditions: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
        pressure: z.number().nullable().optional(),
        dew: z.number().nullable().optional(),
        sunrise: z.string().nullable().optional(),
        sunset: z.string().nullable().optional(),
        sunriseEpoch: z.number().nullable().optional(),
        sunsetEpoch: z.number().nullable().optional(),
      })
      .passthrough()
      .optional(),
    days: z.array(vcDay).min(1),
    description: z.string().nullable().optional(),
  })
  .passthrough();

export type VcResponse = z.infer<typeof vcResponse>;

function toHour(h: z.infer<typeof vcHour>): HourlyWeather {
  return {
    timestamp: h.datetimeEpoch,
    temperature: h.temp,
    feelsLike: h.feelslike ?? h.temp,
    precipitationProbability: h.precipprob ?? 0,
    precipitation: h.precip ?? 0,
    windSpeed: h.windspeed ?? 0,
    windDirection: h.winddir ?? 0,
    conditions: h.conditions ?? "",
    icon: h.icon ?? "",
    humidity: h.humidity ?? 0,
    cloudCover: h.cloudcover ?? 0,
  };
}

/**
 * Shape VC payload into the app model, slicing real previous/next 24h
 * around the location's current hour (§5/35).
 */
export function transformVc(raw: unknown, nowSec = Math.floor(Date.now() / 1000)): WeatherResponse {
  const vc = vcResponse.parse(raw);

  const hours: HourlyWeather[] = vc.days.flatMap((d) => (d.hours ?? []).map(toHour)).sort((a, b) => a.timestamp - b.timestamp);

  // Anchor "now" to the closest hourly record at/before now.
  let anchor = hours.filter((h) => h.timestamp <= nowSec).pop() ?? hours[0];
  const anchorIdx = hours.indexOf(anchor);

  const previous24Hours = hours.slice(Math.max(0, anchorIdx - 23), anchorIdx + 1).map((h) => ({ ...h, isPast: true }));
  const next24Hours = hours.slice(anchorIdx + 1, anchorIdx + 25).map((h) => ({ ...h, isPast: false }));
  anchor = { ...anchor, isNow: true, isPast: false };

  const cc = vc.currentConditions ?? {};
  const today = vc.days[0] ?? {};
  const current: CurrentWeather = {
    temperature: cc.temp ?? today.temp ?? 0,
    feelsLike: cc.feelslike ?? today.feelslike ?? cc.temp ?? 0,
    humidity: cc.humidity ?? today.humidity ?? 0,
    windSpeed: cc.windspeed ?? today.windspeed ?? 0,
    windDirection: cc.winddir ?? today.winddir ?? 0,
    precipitationProbability: cc.precipprob ?? today.precipprob ?? 0,
    precipitation: cc.precip ?? today.precip ?? 0,
    conditions: cc.conditions ?? today.conditions ?? "",
    description: vc.description ?? today.description ?? cc.conditions ?? "",
    uvIndex: cc.uvindex ?? today.uvindex ?? undefined,
    visibility: cc.visibility ?? today.visibility ?? undefined,
    cloudCover: cc.cloudcover ?? today.cloudcover ?? undefined,
    pressure: cc.pressure ?? today.pressure ?? undefined,
    dew: cc.dew ?? today.dew ?? undefined,
    sunrise: cc.sunrise ?? today.sunrise ?? undefined,
    sunset: cc.sunset ?? today.sunset ?? undefined,
    icon: cc.icon ?? today.icon ?? "",
    datetimeEpoch: cc.datetimeEpoch ?? anchor.timestamp,
  };

  const [place, ...rest] = vc.resolvedAddress.split(",").map((s) => s.trim());
  const prev = [...previous24Hours];
  const next = [...next24Hours];
  // Guarantee 24/24 slots even at range edges — pad from the nearest
  // neighboring real hour (working outward from the window), falling back
  // to the range edge only if neighbors are exhausted.
  while (prev.length < 24 && hours.length) {
    const src = hours[Math.max(0, anchorIdx - prev.length - 1)] ?? hours[0];
    prev.unshift({ ...src, isPast: true });
  }
  while (next.length < 24 && hours.length) {
    const src = hours[Math.min(hours.length - 1, anchorIdx + next.length + 1)] ?? hours[hours.length - 1];
    next.push({ ...src, isPast: false });
  }

  return {
    location: {
      name: place || vc.resolvedAddress,
      country: rest.join(", "),
      latitude: vc.latitude,
      longitude: vc.longitude,
      timezone: vc.timezone,
    },
    current,
    previous24Hours: prev.slice(-24),
    next24Hours: next.slice(0, 24),
    sunrise: current.sunrise ?? "",
    sunset: current.sunset ?? "",
    timezone: vc.timezone,
    updatedAt: Date.now(),
  };
}
