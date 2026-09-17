import { test } from "node:test";
import assert from "node:assert/strict";
import { mapCondition, compassLabel, sunProgress, timeOfDay, backgroundFor } from "../lib/weather/conditions.ts";
import { toDisplayTemp, formatTemp, clampLevel } from "../lib/weather/units.ts";
import { moodSentence } from "../lib/weather/mood.ts";

test("maps VC icons to internal conditions", () => {
  assert.equal(mapCondition("partly-cloudy-day", "Partly Cloudy"), "partlyCloudy");
  assert.equal(mapCondition("rain", "Rain"), "rain");
  assert.equal(mapCondition("thunder-rain", "Thunderstorm"), "storm");
  assert.equal(mapCondition("snow", "Snow"), "snow");
  assert.equal(mapCondition("fog", "Fog"), "fog");
  assert.equal(mapCondition("clear-day", "Clear"), "sunny");
  assert.equal(mapCondition("clear-night", "Clear"), "night");
  assert.equal(mapCondition("wind", "Windy"), "wind");
});

test("compass labels", () => {
  assert.equal(compassLabel(0), "N");
  assert.equal(compassLabel(315), "NW");
  assert.equal(compassLabel(180), "S");
});

test("sun progress + time of day", () => {
  assert.equal(sunProgress(12 * 3600, 6 * 3600, 18 * 3600), 0.5);
  assert.equal(timeOfDay(12 * 3600, 6 * 3600, 18 * 3600), "day");
  assert.equal(timeOfDay(3 * 3600, 6 * 3600, 18 * 3600), "night");
});

test("light theme gets bright sky gradients", () => {
  const dark = backgroundFor("sunny", "day", "dark");
  const light = backgroundFor("sunny", "day", "light");
  assert.notEqual(dark.top, light.top);
  assert.match(light.bot, /#eef6fd/);
  assert.equal(backgroundFor("sunny", "day").top, dark.top); // default stays dark
});

test("unit conversion is client-side math", () => {
  assert.equal(toDisplayTemp(0, "F"), 32);
  assert.equal(toDisplayTemp(100, "F"), 212);
  assert.equal(formatTemp(28.4, "C"), "28°");
  assert.equal(formatTemp(28, "F"), "82°");
});

test("atmosphere level clamps to slider range", () => {
  assert.equal(clampLevel(1), 1);
  assert.equal(clampLevel(99), 1.6);
  assert.equal(clampLevel(-5), 0.3);
  assert.equal(clampLevel(NaN), 1);
});

test("mood sentence only uses real values", () => {
  const s = moodSentence(
    { temperature: 31, feelsLike: 33, humidity: 80, windSpeed: 10, windDirection: 0, precipitationProbability: 70, precipitation: 1, conditions: "Rain", description: "", icon: "rain", datetimeEpoch: 0, cloudCover: 90 },
    14
  );
  assert.match(s, /warm afternoon/);
  assert.match(s, /rain likely/);
});
