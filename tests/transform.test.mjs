import { test } from "node:test";
import assert from "node:assert/strict";
import { transformVc } from "../lib/weather/transform.ts";

function vcHour(epoch, temp = 28) {
  return {
    datetime: new Date(epoch * 1000).toISOString(),
    datetimeEpoch: epoch,
    temp,
    feelslike: temp + 2,
    humidity: 70,
    precip: 0,
    precipprob: 10,
    windspeed: 15,
    winddir: 300,
    conditions: "Partly Cloudy",
    icon: "partly-cloudy-day",
    cloudcover: 40,
  };
}

test("splits real previous/next 24h around now", () => {
  const now = Math.floor(Date.now() / 3600) * 3600;
  const days = [0, 1, 2, 3].map((d) => ({
    datetime: `day${d}`,
    temp: 28,
    hours: Array.from({ length: 24 }, (_, h) => vcHour(now - 48 * 3600 + (d * 24 + h) * 3600, 24 + h * 0.2)),
  }));
  const out = transformVc(
    {
      resolvedAddress: "Ahmedabad, Gujarat, India",
      latitude: 23.02,
      longitude: 72.57,
      timezone: "Asia/Kolkata",
      currentConditions: { temp: 28, feelslike: 30, humidity: 74, conditions: "Partly Cloudy", icon: "partly-cloudy-day" },
      days,
    },
    now
  );
  assert.equal(out.previous24Hours.length, 24);
  assert.equal(out.next24Hours.length, 24);
  assert.ok(out.previous24Hours.every((h) => h.timestamp <= now));
  assert.ok(out.next24Hours.every((h) => h.timestamp > now));
  assert.equal(out.location.name, "Ahmedabad");
  assert.equal(out.current.temperature, 28);
});

test("rejects malformed payloads", () => {
  assert.throws(() => transformVc({ nope: true }));
});
