import { test } from "node:test";
import assert from "node:assert/strict";
import {
  decayVelocity,
  isScrollGesture,
  releaseVelocity,
  speed,
  wheelDelta,
  type TouchSample,
} from "./touch-scroll.ts";

test("finger moving up scrolls the remote page down", () => {
  assert.equal(wheelDelta(-40, 1), 40);
  assert.equal(wheelDelta(40, 1), -40);
});

test("wheel delta is scaled into remote CSS pixels", () => {
  // A 1280px-wide frame drawn 390 screen px wide: 1 screen px is ~3.28 remote px.
  assert.equal(wheelDelta(-10, 1280 / 390), (10 * 1280) / 390);
});

test("a finger has to travel past the slop before it scrolls", () => {
  assert.equal(isScrollGesture(0, 0), false);
  assert.equal(isScrollGesture(3, 4), false, "exactly 5px is still a tap");
  assert.equal(isScrollGesture(0, 9), true);
  assert.equal(isScrollGesture(-9, 0), true);
});

test("a steady drag releases at its drag speed", () => {
  const samples: TouchSample[] = [0, 16, 32, 48, 64].map((t) => ({ x: 0, y: -t * 0.5, t }));
  const v = releaseVelocity(samples);
  assert.equal(v.x, 0);
  assert.ok(Math.abs(v.y - -0.5) < 1e-9, `expected -0.5 px/ms, got ${v.y}`);
});

test("a finger that pauses before lifting releases with no fling", () => {
  // Moved until t=40, then held still until the release at t=300.
  const samples: TouchSample[] = [
    { x: 0, y: 0, t: 0 },
    { x: 0, y: -20, t: 20 },
    { x: 0, y: -40, t: 40 },
    { x: 0, y: -40, t: 300 },
  ];
  assert.equal(speed(releaseVelocity(samples)), 0);
});

test("only the recent window sets the release velocity", () => {
  // Fast at the start, slow over the last 100ms before release.
  const samples: TouchSample[] = [
    { x: 0, y: 0, t: 0 },
    { x: 0, y: -200, t: 10 },
    { x: 0, y: -210, t: 150 },
    { x: 0, y: -220, t: 200 },
  ];
  // Window is t >= 100: from t=150 to t=200, 10px over 50ms. The fast
  // first segment (-200px in 10ms) must not leak in.
  const v = releaseVelocity(samples);
  assert.ok(Math.abs(v.y - -0.2) < 1e-9, `expected -0.2 px/ms, got ${v.y}`);
});

test("no or single samples give no velocity", () => {
  assert.equal(speed(releaseVelocity([])), 0);
  assert.equal(speed(releaseVelocity([{ x: 1, y: 1, t: 5 }])), 0);
});

test("coasting slows by a fixed factor per frame, whatever the frame rate", () => {
  const v = { x: 0, y: -1 };
  const oneFrame = decayVelocity(v, 16);
  assert.ok(Math.abs(oneFrame.y - -0.92) < 1e-12);
  const twoHalfFrames = decayVelocity(decayVelocity(v, 8), 8);
  assert.ok(Math.abs(twoHalfFrames.y - oneFrame.y) < 1e-12);
});
