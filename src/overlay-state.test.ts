import { describe, expect, test } from "bun:test";
import { PHI } from "./geometry";
import {
  defaultState,
  flipHorizontal,
  flipVertical,
  move,
  resizeHeight,
  resizeWidth,
  rotate,
} from "./overlay-state";

describe("defaultState", () => {
  test("landscape viewport gets a landscape rect maximized to viewport width", () => {
    const state = defaultState(1000, 800);
    expect(state.orientation).toBe("landscape");
    expect(state.width).toBeCloseTo(1000);
    expect(state.height).toBeCloseTo(1000 / PHI);
  });

  test("landscape viewport whose height is the binding constraint shrinks to fit", () => {
    // width/PHI would exceed viewport height, so height should drive sizing
    const state = defaultState(1000, 400);
    expect(state.orientation).toBe("landscape");
    expect(state.height).toBeCloseTo(400);
    expect(state.width).toBeCloseTo(400 * PHI);
    expect(state.width).toBeLessThanOrEqual(1000);
  });

  test("portrait viewport (mobile) gets a portrait rect by default", () => {
    const state = defaultState(400, 600);
    expect(state.orientation).toBe("portrait");
    expect(state.height).toBeCloseTo(600);
    expect(state.width).toBeCloseTo(600 / PHI);
  });

  test("portrait viewport whose width is the binding constraint shrinks to fit", () => {
    const state = defaultState(300, 1200);
    expect(state.orientation).toBe("portrait");
    expect(state.width).toBeCloseTo(300);
    expect(state.height).toBeCloseTo(300 * PHI);
    expect(state.height).toBeLessThanOrEqual(1200);
  });

  test("defaults to unflipped horizontally but flipped vertically, matching the common spiral representation", () => {
    const state = defaultState(1000, 800);
    expect(state.flippedX).toBe(false);
    expect(state.flippedY).toBe(true);
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

  test("does not change size, orientation, or flip flags", () => {
    const state = defaultState(1000, 800);
    const moved = move(state, 10, 10);
    expect(moved.width).toBeCloseTo(state.width);
    expect(moved.height).toBeCloseTo(state.height);
    expect(moved.orientation).toBe(state.orientation);
    expect(moved.flippedX).toBe(state.flippedX);
    expect(moved.flippedY).toBe(state.flippedY);
  });
});

describe("rotate", () => {
  test("turning a landscape rect 90deg makes it portrait with swapped dimensions, when it still fits", () => {
    // resized down first so the swapped (portrait) dimensions comfortably fit the viewport
    const state = resizeWidth(defaultState(1000, 800), 300);
    const turned = rotate(state, 1000, 800);
    expect(turned.orientation).toBe("portrait");
    expect(turned.width).toBeCloseTo(state.height);
    expect(turned.height).toBeCloseTo(state.width);
  });

  test("clamps the rotated size to fit the viewport when the swapped dimensions would overflow", () => {
    // a landscape overlay covering the full viewport width is taller, once
    // swapped, than the viewport itself -- this used to strand the overlay
    // (and its controls) below the visible area
    const state = defaultState(1000, 800);
    const turned = rotate(state, 1000, 800);
    expect(turned.orientation).toBe("portrait");
    expect(turned.height).toBeLessThanOrEqual(800);
    expect(turned.width).toBeLessThanOrEqual(1000);
    expect(turned.width).toBeCloseTo(turned.height / PHI);
  });

  test("rotating twice returns to the original orientation and size when nothing needs clamping", () => {
    const state = resizeWidth(defaultState(1000, 800), 300);
    const twice = rotate(rotate(state, 1000, 800), 1000, 800);
    expect(twice.orientation).toBe(state.orientation);
    expect(twice.width).toBeCloseTo(state.width);
    expect(twice.height).toBeCloseTo(state.height);
  });

  test("preserves both flip flags", () => {
    const state = flipHorizontal(defaultState(1000, 800));
    const turned = rotate(state, 1000, 800);
    expect(turned.flippedX).toBe(true);
    expect(turned.flippedY).toBe(true);
  });

  test("preserves a dragged position", () => {
    const state = move(defaultState(1000, 800), 40, -15);
    const turned = rotate(state, 1000, 800);
    expect(turned.offsetX).toBeCloseTo(state.offsetX);
    expect(turned.offsetY).toBeCloseTo(state.offsetY);
  });
});

describe("flipHorizontal", () => {
  test("toggles flippedX without touching flippedY, size, or orientation", () => {
    const state = defaultState(1000, 800);
    const flipped = flipHorizontal(state);
    expect(flipped.flippedX).toBe(true);
    expect(flipped.flippedY).toBe(state.flippedY);
    expect(flipped.width).toBeCloseTo(state.width);
    expect(flipped.height).toBeCloseTo(state.height);
    expect(flipHorizontal(flipped).flippedX).toBe(false);
  });
});

describe("flipVertical", () => {
  test("toggles flippedY without touching flippedX, size, or orientation", () => {
    const state = defaultState(1000, 800);
    const flipped = flipVertical(state);
    expect(flipped.flippedY).toBe(!state.flippedY);
    expect(flipped.flippedX).toBe(state.flippedX);
    expect(flipped.width).toBeCloseTo(state.width);
    expect(flipped.height).toBeCloseTo(state.height);
    expect(flipVertical(flipped).flippedY).toBe(state.flippedY);
  });
});

describe("resizeWidth", () => {
  test("keeps the golden ratio when resizing a landscape overlay by width", () => {
    const state = defaultState(1000, 800);
    const resized = resizeWidth(state, 500);
    expect(resized.width).toBeCloseTo(500);
    expect(resized.height).toBeCloseTo(500 / PHI);
  });

  test("keeps the golden ratio when resizing a portrait overlay by width", () => {
    const state = defaultState(400, 800);
    const resized = resizeWidth(state, 200);
    expect(resized.width).toBeCloseTo(200);
    expect(resized.height).toBeCloseTo(200 * PHI);
  });

  test("clamps to a minimum size", () => {
    const state = defaultState(1000, 800);
    const resized = resizeWidth(state, 1, 40);
    expect(resized.width).toBeCloseTo(40);
  });
});

describe("resizeHeight", () => {
  test("keeps the golden ratio when resizing a landscape overlay by height", () => {
    const state = defaultState(1000, 800);
    const resized = resizeHeight(state, 300);
    expect(resized.height).toBeCloseTo(300);
    expect(resized.width).toBeCloseTo(300 * PHI);
  });

  test("keeps the golden ratio when resizing a portrait overlay by height", () => {
    const state = defaultState(400, 800);
    const resized = resizeHeight(state, 400);
    expect(resized.height).toBeCloseTo(400);
    expect(resized.width).toBeCloseTo(400 / PHI);
  });

  test("clamps to a minimum size", () => {
    const state = defaultState(1000, 800);
    const resized = resizeHeight(state, 1, 40);
    expect(resized.height).toBeCloseTo(40);
  });
});
