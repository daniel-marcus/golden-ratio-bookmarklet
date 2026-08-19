import { describe, expect, test } from "bun:test";
import { PHI } from "./geometry";
import { defaultState, flipHorizontal, move, resizeFromCorner, rotate } from "./overlay-state";

describe("defaultState", () => {
  test("landscape viewport gets a landscape rect maximized to viewport width", () => {
    const state = defaultState(1000, 800);
    expect(state.rotation % 2).toBe(0);
    expect(state.width).toBeCloseTo(1000);
    expect(state.height).toBeCloseTo(1000 / PHI);
  });

  test("landscape viewport whose height is the binding constraint shrinks to fit", () => {
    // width/PHI would exceed viewport height, so height should drive sizing
    const state = defaultState(1000, 400);
    expect(state.rotation % 2).toBe(0);
    expect(state.height).toBeCloseTo(400);
    expect(state.width).toBeCloseTo(400 * PHI);
    expect(state.width).toBeLessThanOrEqual(1000);
  });

  test("portrait viewport (mobile) gets a portrait rect by default", () => {
    const state = defaultState(400, 600);
    expect(state.rotation % 2).toBe(1);
    expect(state.height).toBeCloseTo(600);
    expect(state.width).toBeCloseTo(600 / PHI);
  });

  test("portrait viewport whose width is the binding constraint shrinks to fit", () => {
    const state = defaultState(300, 1200);
    expect(state.rotation % 2).toBe(1);
    expect(state.width).toBeCloseTo(300);
    expect(state.height).toBeCloseTo(300 * PHI);
    expect(state.height).toBeLessThanOrEqual(1200);
  });

  test("defaults to flipped", () => {
    const state = defaultState(1000, 800);
    expect(state.flipped).toBe(true);
  });

  test("defaults to a zero offset -- centered, since offsets are relative to the viewport center", () => {
    const state = defaultState(1000, 800);
    expect(state.offsetX).toBe(0);
    expect(state.offsetY).toBe(0);
  });
});

describe("move", () => {
  test("shifts the overlay's offset by the given deltas", () => {
    const state = defaultState(1000, 800);
    const moved = move(state, 30, -20);
    expect(moved.offsetX).toBeCloseTo(state.offsetX + 30);
    expect(moved.offsetY).toBeCloseTo(state.offsetY - 20);
  });

  test("does not clamp to the viewport -- dragging is free", () => {
    const state = defaultState(1000, 800);
    const moved = move(state, -5000, 9000);
    expect(moved.offsetX).toBeCloseTo(state.offsetX - 5000);
    expect(moved.offsetY).toBeCloseTo(state.offsetY + 9000);
  });

  test("does not change size, rotation, or flip", () => {
    const state = defaultState(1000, 800);
    const moved = move(state, 10, 10);
    expect(moved.width).toBeCloseTo(state.width);
    expect(moved.height).toBeCloseTo(state.height);
    expect(moved.rotation).toBe(state.rotation);
    expect(moved.flipped).toBe(state.flipped);
  });
});

describe("rotate", () => {
  test("turning a landscape rect 90deg makes it portrait with swapped dimensions, when it still fits", () => {
    // resized down first so the swapped (portrait) dimensions comfortably fit the viewport
    const state = resizeFromCorner(defaultState(1000, 800), "bottom-right", 300);
    const turned = rotate(state, 1000, 800);
    expect(turned.rotation).toBe(((state.rotation + 1) % 4) as typeof state.rotation);
    expect(turned.rotation % 2).toBe(1);
    expect(turned.width).toBeCloseTo(state.height);
    expect(turned.height).toBeCloseTo(state.width);
  });

  test("clamps the rotated size to fit the viewport when the swapped dimensions would overflow", () => {
    // a landscape overlay covering the full viewport width is taller, once
    // swapped, than the viewport itself -- this used to strand the overlay
    // (and its controls) below the visible area
    const state = defaultState(1000, 800);
    const turned = rotate(state, 1000, 800);
    expect(turned.rotation % 2).toBe(1);
    expect(turned.height).toBeLessThanOrEqual(800);
    expect(turned.width).toBeLessThanOrEqual(1000);
    expect(turned.width).toBeCloseTo(turned.height / PHI);
  });

  test("rotating twice returns to the original rotation parity and size when nothing needs clamping", () => {
    const state = resizeFromCorner(defaultState(1000, 800), "bottom-right", 300);
    const twice = rotate(rotate(state, 1000, 800), 1000, 800);
    expect(twice.rotation).toBe(((state.rotation + 2) % 4) as typeof state.rotation);
    expect(twice.width).toBeCloseTo(state.width);
    expect(twice.height).toBeCloseTo(state.height);
  });

  test("preserves the flip flag", () => {
    const state = flipHorizontal(defaultState(1000, 800));
    const turned = rotate(state, 1000, 800);
    expect(turned.flipped).toBe(state.flipped);
  });

  test("rotating twice returns to the default size when the overlay was never resized, even when the swapped size needed clamping", () => {
    // landscape viewport where the default rect is width-bound, so the first
    // rotate (to portrait) has to clamp its height down to fit the viewport
    const state = defaultState(1000, 800);
    const twice = rotate(rotate(state, 1000, 800), 1000, 800);
    expect(twice.rotation % 2).toBe(state.rotation % 2);
    expect(twice.width).toBeCloseTo(state.width);
    expect(twice.height).toBeCloseTo(state.height);
  });

  test("preserves a dragged position", () => {
    const state = move(defaultState(1000, 800), 40, -15);
    const turned = rotate(state, 1000, 800);
    expect(turned.offsetX).toBeCloseTo(state.offsetX);
    expect(turned.offsetY).toBeCloseTo(state.offsetY);
  });

  test("cycles through all four quarter-turns and returns to the start on the fourth rotate", () => {
    const state = defaultState(1000, 800);
    const rotations: number[] = [state.rotation];
    let current = state;
    for (let i = 0; i < 4; i++) {
      current = rotate(current, 1000, 800);
      rotations.push(current.rotation);
    }
    expect(rotations).toEqual([
      state.rotation,
      (state.rotation + 1) % 4,
      (state.rotation + 2) % 4,
      (state.rotation + 3) % 4,
      state.rotation,
    ]);
  });
});

describe("flipHorizontal", () => {
  test("toggles flipped without touching size or rotation", () => {
    const state = defaultState(1000, 800);
    const flipped = flipHorizontal(state);
    expect(flipped.flipped).toBe(!state.flipped);
    expect(flipped.rotation).toBe(state.rotation);
    expect(flipped.width).toBeCloseTo(state.width);
    expect(flipped.height).toBeCloseTo(state.height);
    expect(flipHorizontal(flipped).flipped).toBe(state.flipped);
  });
});

describe("resizeFromCorner", () => {
  function edges(s: { width: number; height: number; offsetX: number; offsetY: number }) {
    return {
      left: s.offsetX - s.width / 2,
      right: s.offsetX + s.width / 2,
      top: s.offsetY - s.height / 2,
      bottom: s.offsetY + s.height / 2,
    };
  }

  test("keeps the golden ratio when resizing a landscape overlay from a corner", () => {
    const state = defaultState(1000, 800);
    const resized = resizeFromCorner(state, "bottom-right", 500);
    expect(resized.width).toBeCloseTo(500);
    expect(resized.height).toBeCloseTo(500 / PHI);
  });

  test("keeps the golden ratio when resizing a portrait overlay from a corner", () => {
    const state = defaultState(400, 800);
    const resized = resizeFromCorner(state, "bottom-right", 200);
    expect(resized.height).toBeCloseTo(200);
    expect(resized.width).toBeCloseTo(200 / PHI);
  });

  test("clamps to a minimum size", () => {
    const state = defaultState(1000, 800);
    const resized = resizeFromCorner(state, "bottom-right", 1, 40);
    expect(resized.width).toBeCloseTo(40);
  });

  test("marks the state as resized", () => {
    const state = defaultState(1000, 800);
    expect(state.resized).toBe(false);
    expect(resizeFromCorner(state, "bottom-right", 500).resized).toBe(true);
  });

  test("dragging the bottom-right corner anchors the top-left corner in place", () => {
    const state = defaultState(1000, 800);
    const before = edges(state);
    const resized = resizeFromCorner(state, "bottom-right", 500);
    const after = edges(resized);
    expect(after.left).toBeCloseTo(before.left);
    expect(after.top).toBeCloseTo(before.top);
    expect(after.right).toBeCloseTo(before.left + resized.width);
    expect(after.bottom).toBeCloseTo(before.top + resized.height);
  });

  test("dragging the top-left corner anchors the bottom-right corner in place", () => {
    const state = defaultState(1000, 800);
    const before = edges(state);
    const resized = resizeFromCorner(state, "top-left", 500);
    const after = edges(resized);
    expect(after.right).toBeCloseTo(before.right);
    expect(after.bottom).toBeCloseTo(before.bottom);
  });

  test("dragging the top-right corner anchors the bottom-left corner in place", () => {
    const state = defaultState(1000, 800);
    const before = edges(state);
    const resized = resizeFromCorner(state, "top-right", 500);
    const after = edges(resized);
    expect(after.left).toBeCloseTo(before.left);
    expect(after.bottom).toBeCloseTo(before.bottom);
  });

  test("dragging the bottom-left corner anchors the top-right corner in place", () => {
    const state = defaultState(1000, 800);
    const before = edges(state);
    const resized = resizeFromCorner(state, "bottom-left", 500);
    const after = edges(resized);
    expect(after.right).toBeCloseTo(before.right);
    expect(after.top).toBeCloseTo(before.top);
  });
});
