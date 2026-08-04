import { describe, expect, test } from "bun:test";
import { PHI } from "./geometry";
import { defaultState } from "./overlay-state";
import { OVERLAY_ID, createOverlay, renderOverlay } from "./overlay-dom";

describe("createOverlay", () => {
  test("mounts a single overlay root with a known id", () => {
    const overlay = createOverlay();
    document.body.appendChild(overlay.root);
    expect(document.getElementById(OVERLAY_ID)).toBe(overlay.root);
    overlay.root.remove();
  });

  test("contains an SVG for the golden-ratio drawing and four corner resize handles", () => {
    const overlay = createOverlay();
    expect(overlay.svg.tagName.toLowerCase()).toBe("svg");
    for (const corner of ["top-left", "top-right", "bottom-left", "bottom-right"] as const) {
      expect(overlay.handles[corner]).toBeInstanceOf(HTMLElement);
    }
    expect(overlay.controls).toBeInstanceOf(HTMLElement);
  });

  test("gives opposite-diagonal corners matching resize cursors", () => {
    const overlay = createOverlay();
    expect(overlay.handles["top-left"].style.cursor).toBe("nwse-resize");
    expect(overlay.handles["bottom-right"].style.cursor).toBe("nwse-resize");
    expect(overlay.handles["top-right"].style.cursor).toBe("nesw-resize");
    expect(overlay.handles["bottom-left"].style.cursor).toBe("nesw-resize");
  });

  test("contains a drag frame with four edge strips that catch pointer events", () => {
    const overlay = createOverlay();
    expect(overlay.dragFrame).toBeInstanceOf(HTMLElement);
    const strips = overlay.dragFrame.children;
    expect(strips.length).toBe(4);
    for (const strip of Array.from(strips)) {
      expect((strip as HTMLElement).style.pointerEvents).toBe("auto");
    }
  });
});

describe("renderOverlay", () => {
  test("sizes the root element to the state's width/height", () => {
    const overlay = createOverlay();
    const state = defaultState(1000, 800);
    renderOverlay(overlay, state);
    expect(overlay.root.style.width).toBe("1000px");
    expect(parseFloat(overlay.root.style.height)).toBeCloseTo(1000 / PHI, 3);
  });

  test("centers the root in the viewport, shifted by the state's offset", () => {
    const overlay = createOverlay();
    const state = { ...defaultState(1000, 800), offsetX: 30, offsetY: -25 };
    renderOverlay(overlay, state);
    expect(overlay.root.style.left).toBe("50%");
    expect(overlay.root.style.top).toBe("50%");
    expect(overlay.root.style.transform).toContain(
      "translate(calc(-50% + 30px), calc(-50% + -25px))",
    );
  });

  test("with a zero offset, centers exactly", () => {
    const overlay = createOverlay();
    const state = defaultState(1000, 800);
    renderOverlay(overlay, state);
    expect(overlay.root.style.transform).toContain("translate(calc(-50% + 0px), calc(-50% + 0px))");
  });

  test("applies a horizontal mirror transform when flipped", () => {
    const overlay = createOverlay();
    const state = { ...defaultState(1000, 800), flipped: true };
    renderOverlay(overlay, state);
    expect(overlay.svg.style.transform).toContain("scale(-1, 1)");
  });

  test("applies no mirror transform when not flipped", () => {
    const overlay = createOverlay();
    const state = { ...defaultState(1000, 800), flipped: false };
    renderOverlay(overlay, state);
    expect(overlay.svg.style.transform).toContain("scale(1, 1)");
  });

  test("rotates the svg by 90deg per quarter-turn of state.rotation", () => {
    const overlay = createOverlay();
    const state = { ...defaultState(1000, 800), rotation: 0 as const };
    renderOverlay(overlay, state);
    expect(overlay.svg.style.transform).toContain("rotate(0deg)");

    const state90 = { ...state, rotation: 1 as const };
    renderOverlay(overlay, state90);
    expect(overlay.svg.style.transform).toContain("rotate(90deg)");

    const state180 = { ...state, rotation: 2 as const };
    renderOverlay(overlay, state180);
    expect(overlay.svg.style.transform).toContain("rotate(180deg)");

    const state270 = { ...state, rotation: 3 as const };
    renderOverlay(overlay, state270);
    expect(overlay.svg.style.transform).toContain("rotate(270deg)");
  });

  test("swaps the svg's own width/height (pre-rotation) when the rotation is a quarter turn", () => {
    const overlay = createOverlay();
    const state = defaultState(1000, 800); // rotation 2, even -> no swap
    renderOverlay(overlay, state);
    expect(parseFloat(overlay.svg.style.width)).toBeCloseTo(state.width);
    expect(parseFloat(overlay.svg.style.height)).toBeCloseTo(state.height);

    const turnedState = { ...state, rotation: 1 as const };
    renderOverlay(overlay, turnedState);
    expect(parseFloat(overlay.svg.style.width)).toBeCloseTo(state.height);
    expect(parseFloat(overlay.svg.style.height)).toBeCloseTo(state.width);
  });

  test("draws one rect per spiral square, plus matching arcs and circles", () => {
    const overlay = createOverlay();
    const state = defaultState(400, 300);
    renderOverlay(overlay, state);
    const rects = overlay.svg.querySelectorAll("rect");
    const paths = overlay.svg.querySelectorAll("path");
    const circles = overlay.svg.querySelectorAll("circle");
    expect(rects.length).toBeGreaterThan(0);
    expect(rects.length).toBe(paths.length);
    expect(rects.length).toBe(circles.length);
  });

  test("re-rendering replaces the previous drawing instead of accumulating", () => {
    const overlay = createOverlay();
    renderOverlay(overlay, defaultState(400, 300));
    const firstCount = overlay.svg.querySelectorAll("rect").length;
    renderOverlay(overlay, defaultState(400, 300));
    expect(overlay.svg.querySelectorAll("rect").length).toBe(firstCount);
  });
});
