import { test } from "node:test";
import assert from "node:assert/strict";
import { skyPaletteFor } from "../lib/weather/sky.ts";

test("storm is the most extreme sky — full cover, fast clouds, lightning", () => {
  const s = skyPaletteFor("storm", "day", "dark");
  const clear = skyPaletteFor("clear", "day", "dark");
  assert.ok(s.cloudCover > clear.cloudCover);
  assert.ok(s.cloudSpeed > clear.cloudSpeed);
  assert.equal(s.flash, 1);
  assert.equal(clear.flash, 0);
});

test("clear night has stars and aurora; day has neither", () => {
  const night = skyPaletteFor("clear", "night", "dark");
  const day = skyPaletteFor("clear", "day", "dark");
  assert.ok(night.stars > 0.5);
  assert.ok(night.aurora > 0.5);
  assert.equal(day.stars, 0);
  assert.equal(day.aurora, 0);
});

test("precip scenes kill stars and aurora", () => {
  for (const scene of ["rain", "snow", "fog"]) {
    for (const tod of ["day", "night"]) {
      const p = skyPaletteFor(scene, tod, "dark");
      assert.equal(p.flash, 0, `${scene}/${tod} must not strobe`);
      if (scene !== "snow" && scene !== "fog") {
        assert.equal(p.stars, 0, `${scene}/${tod} must not show stars`);
        assert.equal(p.aurora, 0, `${scene}/${tod} must not show aurora`);
      }
    }
  }
});

test("light theme keeps bright palettes; scene drama (flash) survives theme", () => {
  const storm = skyPaletteFor("storm", "day", "light");
  assert.ok(storm.flash > 0); // storms flash in daylight too
  assert.ok(["#8d9cb0", "#5d6c80"].includes(storm.horizon)); // still a light-day palette
  const night = skyPaletteFor("clear", "night", "light");
  assert.ok(night.stars < 0.5);
  assert.ok(night.aurora < 0.5);
  const day = skyPaletteFor("clear", "day", "light");
  assert.ok(day.horizon.startsWith("#b") || day.horizon.startsWith("#d") || day.horizon.startsWith("#a"));
});

test("rain is calmer than storm but heavier than clear", () => {
  const storm = skyPaletteFor("storm", "day", "dark");
  const rain = skyPaletteFor("rain", "day", "dark");
  const clear = skyPaletteFor("clear", "day", "dark");
  assert.ok(rain.cloudCover > clear.cloudCover);
  assert.ok(rain.cloudCover < storm.cloudCover);
  assert.ok(rain.cloudSpeed < storm.cloudSpeed);
  assert.equal(rain.flash, 0);
});

test("sunset palette is warm-toned at the horizon", () => {
  const s = skyPaletteFor("clear", "sunset", "dark");
  // #c2593a — red channel dominates
  assert.equal(s.horizon, "#c2593a");
  assert.ok(s.halo === "#ff8a3d");
});
