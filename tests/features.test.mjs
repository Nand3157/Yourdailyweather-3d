import { test } from "node:test";
import assert from "node:assert/strict";
import { transformVc } from "../lib/weather/transform.ts";
import { aqiBand, aqiProgress, pollutantRows } from "../lib/weather/aqi.ts";

// ---------- 7-day daily forecast ----------

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

function vcDay(epoch, temp = 28) {
  return {
    datetime: new Date(epoch * 1000).toISOString(),
    datetimeEpoch: epoch,
    temp,
    tempmin: temp - 6,
    tempmax: temp + 3,
    precipprob: 30,
    precip: 0.5,
    windspeed: 12,
    winddir: 250,
    humidity: 65,
    uvindex: 6.4,
    conditions: "Partly Cloudy",
    icon: "partly-cloudy-day",
    sunrise: "06:30",
    sunset: "18:45",
    hours: Array.from({ length: 24 }, (_, h) => vcHour(epoch + h * 3600, temp)),
  };
}

const NOW = Math.floor(Date.now() / 1000);

function payload(nDays) {
  const days = Array.from({ length: nDays }, (_, i) => vcDay(NOW - 86400 + i * 86400, 24 + i));
  return {
    resolvedAddress: "Ahmedabad, Gujarat, India",
    latitude: 23.02,
    longitude: 72.57,
    timezone: "Asia/Kolkata",
    currentConditions: { temp: 24, conditions: "Partly Cloudy", icon: "partly-cloudy-day", datetimeEpoch: NOW },
    days,
  };
}

test("daily forecast: 7 entries with min/max and today flag", () => {
  const out = transformVc(payload(5), NOW);
  assert.equal(out.daily.length, 7); // padded up to 7 even with 5 upstream days
  assert.equal(out.daily[0].isToday, true);
  assert.ok(out.daily.slice(1).every((d) => !d.isToday));
  assert.equal(out.daily[0].tempMin, 18); // 24 - 6
  assert.equal(out.daily[0].tempMax, 27); // 24 + 3
  assert.ok(out.daily[0].uvIndex !== undefined);
  // Padded entries repeat the last real day's temps but advance the date:
  // 5 real days padded to 7 → indices 5 and 6 chain off day 4 (+86400 each).
  const last = out.daily[out.daily.length - 1];
  assert.equal(last.tempMin, out.daily[4].tempMin);
  assert.equal(out.daily[5].date, out.daily[4].date + 86400);
  assert.equal(last.date, out.daily[4].date + 2 * 86400);
});

test("daily forecast: caps at 7 when upstream has more days", () => {
  const out = transformVc(payload(9), NOW);
  assert.equal(out.daily.length, 7);
  assert.ok(out.daily.every((d) => d.icon.length > 0));
});

test("hourly windows are unchanged by daily addition", () => {
  const out = transformVc(payload(4), NOW);
  assert.equal(out.previous24Hours.length, 24);
  assert.equal(out.next24Hours.length, 24);
  assert.equal(out.current.temperature, 24);
});

// ---------- AQI ----------

test("AQI bands match EPA thresholds", () => {
  assert.equal(aqiBand(0).label, "Good");
  assert.equal(aqiBand(50).label, "Good");
  assert.equal(aqiBand(51).label, "Moderate");
  assert.equal(aqiBand(100).label, "Moderate");
  assert.equal(aqiBand(101).label, "Unhealthy for sensitive groups");
  assert.equal(aqiBand(150).label, "Unhealthy for sensitive groups");
  assert.equal(aqiBand(151).label, "Unhealthy");
  assert.equal(aqiBand(201).label, "Very unhealthy");
  assert.equal(aqiBand(301).label, "Hazardous");
  assert.equal(aqiBand(500).label, "Hazardous");
  // Non-finite / negative inputs degrade to Good rather than exploding.
  assert.equal(aqiBand(NaN).label, "Good");
  assert.equal(aqiBand(-5).label, "Good");
});

test("AQI dial progress saturates at 300", () => {
  assert.equal(aqiProgress(0), 0);
  assert.equal(aqiProgress(150), 0.5);
  assert.equal(aqiProgress(300), 1);
  assert.equal(aqiProgress(450), 1);
});

test("pollutant rows drop missing values and keep units", () => {
  const rows = pollutantRows({ pm2_5: 12.4, pm10: null, ozone: 48 });
  assert.equal(rows.length, 6);
  const pm25 = rows.find((r) => r.key === "pm2_5");
  assert.equal(pm25.value, 12.4);
  assert.equal(pm25.unit, "µg/m³");
  assert.equal(rows.find((r) => r.key === "pm10").value, undefined);
});
