import { test } from "node:test";
import assert from "node:assert/strict";
import { heroSceneFor, resolveHeroInput } from "../lib/weather/hero.ts";

test("hero branching — 5 scenes", () => {
  assert.equal(heroSceneFor("rain", "day"), "rain");
  assert.equal(heroSceneFor("snow", "night"), "snow");
  assert.equal(heroSceneFor("storm", "day"), "storm");
  assert.equal(heroSceneFor("fog", "day"), "fog");
  assert.equal(heroSceneFor("cloudy", "day"), "fog");
  assert.equal(heroSceneFor("sunny", "day"), "clear");
  assert.equal(heroSceneFor("partlyCloudy", "sunset"), "clear");
  assert.equal(heroSceneFor("wind", "day"), "clear");
  assert.equal(heroSceneFor("night", "night"), "clear");
});

test("resolve merges Weather State + Time of Day", () => {
  // 10:00 between 06:00–18:00 → day + clear
  const { tod, scene } = resolveHeroInput("sunny", 10 * 3600, 6 * 3600, 18 * 3600);
  assert.equal(tod, "day");
  assert.equal(scene, "clear");
  // 23:00 → night
  const n = resolveHeroInput("rain", 23 * 3600, 6 * 3600, 18 * 3600);
  assert.equal(n.tod, "night");
  assert.equal(n.scene, "rain");
});
