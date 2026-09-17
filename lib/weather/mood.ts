import type { CurrentWeather } from "./types";

/**
 * One-line mood sentence generated ONLY from real API values (§10/58).
 * Never invents conditions not present in the data.
 */
export function moodSentence(c: CurrentWeather, hour: number): string {
  const warm = c.temperature >= 30;
  const mild = c.temperature >= 20 && c.temperature < 30;
  const cool = c.temperature < 20 && c.temperature >= 10;
  const daypart = hour >= 5 && hour < 12 ? "morning" : hour >= 12 && hour < 17 ? "afternoon" : hour >= 17 && hour < 21 ? "evening" : "night";
  const heat = warm ? "warm" : mild ? "pleasant" : cool ? "cool" : "cold";
  const bits: string[] = [];

  if ((c.precipitationProbability ?? 0) >= 60) bits.push("with rain likely");
  else if ((c.precipitationProbability ?? 0) >= 30) bits.push("with a chance of rain");
  if ((c.humidity ?? 0) >= 75) bits.push("humid");
  if ((c.windSpeed ?? 0) >= 25) bits.push("breezy");
  if ((c.cloudCover ?? 0) >= 70) bits.push("overcast skies");
  else if ((c.cloudCover ?? 0) >= 30) bits.push("partly cloudy skies");
  else bits.push("clear skies");
  if ((c.uvIndex ?? 0) >= 8 && daypart !== "night") bits.push("strong sun");

  const tail = bits.length ? ` ${bits.join(", ")}.` : ".";
  return `A ${heat} ${daypart}${tail}`;
}
