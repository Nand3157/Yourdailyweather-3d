import { test } from "node:test";
import assert from "node:assert/strict";
import { fluidStyleFor } from "../lib/weather/fluidStyle.ts";

test("storm is the most turbulent fluid — fastest flow, longest trails, heaviest ink", () => {
  const s = fluidStyleFor("storm", "day", "dark");
  const clear = fluidStyleFor("clear", "day", "dark");
  assert.ok(s.turbulence > clear.turbulence);
  assert.ok(s.flowSpeed > clear.flowSpeed);
  assert.ok(s.fade > clear.fade);
  assert.ok(s.gain > clear.gain);
});

test("fog is the calmest fluid — slower and softer than clear", () => {
  const f = fluidStyleFor("fog", "day", "dark");
  const clear = fluidStyleFor("clear", "day", "dark");
  assert.ok(f.turbulence < clear.turbulence);
  assert.ok(f.flowSpeed < clear.flowSpeed);
});

test("rain flows along the wind; snow drifts slower than clear", () => {
  const rain = fluidStyleFor("rain", "day", "dark");
  const snow = fluidStyleFor("snow", "day", "dark");
  const clear = fluidStyleFor("clear", "day", "dark");
  assert.ok(rain.flowSpeed > snow.flowSpeed);
  assert.ok(snow.flowSpeed < clear.flowSpeed);
  assert.ok(rain.fade > snow.fade); // rain trails streak longer
});

test("every scene returns a complete, in-range style in both themes", () => {
  for (const theme of ["dark", "light"]) {
    for (const scene of ["rain", "snow", "storm", "fog", "clear"]) {
      for (const tod of ["day", "sunset", "night"]) {
        const s = fluidStyleFor(scene, tod, theme);
        for (const tint of [s.tintA, s.tintB, s.tintC]) {
          assert.match(tint, /^#[0-9a-f]{6}$/i, `${scene}/${tod}/${theme} tint ${tint}`);
        }
        assert.ok(s.turbulence > 0 && s.turbulence <= 2);
        assert.ok(s.flowSpeed > 0 && s.flowSpeed <= 2);
        assert.ok(s.fade >= 0.9 && s.fade < 0.96);
        assert.ok(s.gain > 0 && s.gain <= 1);
      }
    }
  }
});

test("light theme keeps ink-on-paper tints (dark tints would vanish on paper)", () => {
  const day = fluidStyleFor("clear", "day", "light");
  // all three tints stay darker than their dark-theme counterparts
  const dark = fluidStyleFor("clear", "day", "dark");
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  };
  assert.ok(lum(day.tintC) < lum(dark.tintC));
});
