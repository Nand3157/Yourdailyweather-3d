import { test } from "node:test";
import assert from "node:assert/strict";
import { themeBySun, minutesInZone, timeStringToMinutes, localTimeToEpochToday } from "../lib/weather/theme.ts";

const todayAt = (h, min = 0) => {
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d.getTime();
};

test("follows the location's sun: light during its day, dark at its night", () => {
  const rise = "06:30";
  const set = "18:29";
  // Device noon + location noon → light regardless of zone offset.
  assert.equal(themeBySun(todayAt(12), "Asia/Kolkata", rise, set), "light");
  // 23:30 in the location → dark.
  assert.equal(themeBySun(todayAt(12), "Asia/Kolkata", rise, "12:00"), "dark");
});

test("location timezone decides 'now' — not the device clock", () => {
  // 2026-01-01T18:00:00Z is 23:30 in Kolkata (IST, +5:30) and 13:00 in New York.
  const ts = Date.UTC(2026, 0, 1, 18, 0, 0);
  assert.equal(themeBySun(ts, "Asia/Kolkata", "06:00", "18:00"), "dark");
  assert.equal(themeBySun(ts, "America/New_York", "06:00", "18:00"), "light");
});

test("sunrise/sunset refine the window; edges behave", () => {
  const tz = "Asia/Kolkata";
  assert.equal(themeBySun(Date.UTC(2026, 0, 1, 0, 30), tz, "06:30", "18:29"), "dark"); // 06:00 IST, before sunrise
  assert.equal(themeBySun(Date.UTC(2026, 0, 1, 1, 0), tz, "06:30", "18:29"), "light"); // 06:30 IST, exactly sunrise
  assert.equal(themeBySun(Date.UTC(2026, 0, 1, 12, 58), tz, "06:30", "18:29"), "light"); // 18:28 IST, just before sunset
  assert.equal(themeBySun(Date.UTC(2026, 0, 1, 12, 59), tz, "06:30", "18:29"), "dark"); // 18:29 IST = sunset, half-open
});

test("unknown timezone falls back to the device clock, coarse 6-18 window", () => {
  assert.equal(themeBySun(todayAt(9), null), "light");
  assert.equal(themeBySun(todayAt(21), null), "dark");
  assert.equal(themeBySun(todayAt(9), "Not/AZone"), "light");
});

test("no sunrise data -> coarse window in location time", () => {
  // 2026-01-01T18:00:00Z = 23:30 IST → dark even though device may be midday.
  assert.equal(themeBySun(Date.UTC(2026, 0, 1, 18, 0), "Asia/Kolkata"), "dark");
});

test("minutesInZone parses zone-local time", () => {
  // 2026-01-01T18:07:00Z = 23:37 IST.
  assert.equal(minutesInZone(Date.UTC(2026, 0, 1, 18, 7), "Asia/Kolkata"), 23 * 60 + 37);
  assert.equal(minutesInZone(Date.UTC(2026, 0, 1, 18, 7), "Not/AZone"), null);
});

test("timeStringToMinutes handles 24h, 12h and malformed input", () => {
  assert.equal(timeStringToMinutes("06:24"), 6 * 60 + 24);
  assert.equal(timeStringToMinutes("6:24:00 PM"), 18 * 60 + 24);
  assert.equal(timeStringToMinutes("12:05 AM"), 5);
  assert.equal(timeStringToMinutes("garbage"), null);
  assert.equal(timeStringToMinutes(undefined), null);
});

test("localTimeToEpochToday still returns device-day epochs", () => {
  const now = todayAt(15);
  assert.equal(localTimeToEpochToday("06:24", now), todayAt(6, 24));
  assert.equal(localTimeToEpochToday("6:24 PM", now), todayAt(18, 24));
  assert.equal(localTimeToEpochToday(undefined, now), null);
});
