import type { WeatherResponse } from "./types";

/**
 * Realistic dev/demo fallback ONLY when no API key is configured (§60).
 * `?scene=` overrides the weather story so every 3D hero scene
 * (storm / rain / snow / fog / cloudy / wind / clear × day-sunset-night)
 * can be demoed and verified without waiting for the real sky to cooperate.
 */

type DemoScene =
  | "storm"
  | "rain"
  | "snow"
  | "fog"
  | "cloudy"
  | "wind"
  | "clear-day"
  | "clear-sunset"
  | "clear-night";

const SCENES: Record<
  DemoScene,
  {
    conditions: string;
    icon: string;
    temp: number;
    feels: number;
    humidity: number;
    wind: number;
    precipProb: number;
    cloud: number;
    hourStart: number; // demo hour that anchors "now" (local demo clock)
  }
> = {
  storm: { conditions: "Thunderstorm", icon: "thunderstorm", temp: 24, feels: 26, humidity: 88, wind: 34, precipProb: 95, cloud: 96, hourStart: 17 },
  rain: { conditions: "Rain Showers", icon: "rain", temp: 21, feels: 22, humidity: 85, wind: 22, precipProb: 80, cloud: 85, hourStart: 14 },
  snow: { conditions: "Snow", icon: "snow", temp: -3, feels: -7, humidity: 78, wind: 12, precipProb: 85, cloud: 70, hourStart: 11 },
  fog: { conditions: "Fog", icon: "fog", temp: 9, feels: 8, humidity: 96, wind: 4, precipProb: 10, cloud: 60, hourStart: 6 },
  cloudy: { conditions: "Overcast", icon: "cloudy", temp: 17, feels: 17, humidity: 65, wind: 15, precipProb: 20, cloud: 90, hourStart: 13 },
  wind: { conditions: "Windy", icon: "wind", temp: 19, feels: 18, humidity: 45, wind: 42, precipProb: 5, cloud: 25, hourStart: 15 },
  "clear-day": { conditions: "Clear", icon: "clear-day", temp: 31, feels: 33, humidity: 40, wind: 10, precipProb: 2, cloud: 8, hourStart: 13 },
  "clear-sunset": { conditions: "Clear", icon: "clear-day", temp: 27, feels: 27, humidity: 48, wind: 8, precipProb: 3, cloud: 15, hourStart: 19 },
  "clear-night": { conditions: "Clear", icon: "clear-night", temp: 16, feels: 15, humidity: 55, wind: 6, precipProb: 2, cloud: 5, hourStart: 23 },
};

function isDemoScene(v: string | undefined): v is DemoScene {
  return !!v && Object.prototype.hasOwnProperty.call(SCENES, v);
}

export function demoResponse(query: string, sceneParam?: string): WeatherResponse {
  const scene: DemoScene = isDemoScene(sceneParam) ? sceneParam : "clear-day";
  const cfg = SCENES[scene];

  // Anchor the payload's "now" at the scene's hour so time-of-day splits work.
  const d = new Date();
  d.setHours(cfg.hourStart, 0, 0, 0);
  const nowEpoch = Math.floor(d.getTime() / 1000);
  const now = nowEpoch - (nowEpoch % 3600);

  const hours = Array.from({ length: 72 }, (_, i) => {
    const t = now - 36 * 3600 + i * 3600;
    const dayCurve = Math.sin(((i % 24) / 24) * Math.PI * 2 - Math.PI / 2) * 4;
    const wet = i % 24 >= 16 && i % 24 <= 20 && (scene === "storm" || scene === "rain");
    return {
      timestamp: t,
      temperature: Math.round((cfg.temp + dayCurve) * 10) / 10,
      feelsLike: Math.round((cfg.feels + dayCurve) * 10) / 10,
      precipitationProbability: wet ? cfg.precipProb : Math.round(cfg.precipProb * 0.2),
      precipitation: 0,
      windSpeed: cfg.wind + (i % 5),
      windDirection: 300 + (i % 20),
      conditions: wet ? cfg.conditions : scene === "cloudy" ? "Cloudy" : cfg.conditions,
      icon: wet ? cfg.icon : scene === "cloudy" ? "cloudy" : cfg.icon,
      humidity: cfg.humidity,
      cloudCover: cfg.cloud,
    };
  });
  const anchor = hours.findIndex((h) => h.timestamp >= now);

  return {
    location: { name: (query || "Ahmedabad").split(",")[0].trim(), country: "India", latitude: 23.0225, longitude: 72.5714, timezone: "Asia/Kolkata" },
    current: {
      temperature: cfg.temp,
      feelsLike: cfg.feels,
      humidity: cfg.humidity,
      windSpeed: cfg.wind,
      windDirection: 315,
      precipitationProbability: cfg.precipProb,
      precipitation: scene === "storm" || scene === "rain" ? 2.4 : 0,
      conditions: cfg.conditions,
      description: `${cfg.conditions} — demo scene for the 3D atmosphere.`,
      uvIndex: scene === "clear-day" ? 8 : 2,
      visibility: scene === "fog" ? 1 : 10,
      cloudCover: cfg.cloud,
      pressure: 1008,
      dew: Math.round(cfg.temp - (100 - cfg.humidity) / 5),
      sunrise: "06:32",
      sunset: "18:55",
      icon: cfg.icon,
      datetimeEpoch: nowEpoch,
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
