import { beforeEach, describe, expect, test } from "bun:test";
import { PHI } from "./geometry";
import { OVERLAY_ID } from "./overlay-dom";
import { init } from "./bookmarklet";

function click(el: Element) {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

beforeEach(() => {
  document.getElementById(OVERLAY_ID)?.remove();
  Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
});

describe("init", () => {
  test("injects the overlay sized to the golden ratio of the viewport", () => {
    init();
    const root = document.getElementById(OVERLAY_ID)!;
    expect(root).not.toBeNull();
    expect(parseFloat(root.style.width)).toBeCloseTo(1000, 3);
    expect(parseFloat(root.style.height)).toBeCloseTo(1000 / PHI, 3);
  });

  test("calling it again toggles the overlay off", () => {
    init();
    expect(document.getElementById(OVERLAY_ID)).not.toBeNull();
    init();
    expect(document.getElementById(OVERLAY_ID)).toBeNull();
  });

  test("the horizontal flip button mirrors the drawing along x and back", () => {
    init();
    const root = document.getElementById(OVERLAY_ID)!;
    const svg = root.querySelector("svg")!;
    const flipBtn = root.querySelector<HTMLElement>(
      '[data-action="flip-horizontal"]',
    )!;
    const transformBefore = svg.style.transform;

    click(flipBtn);
    expect(svg.style.transform).not.toBe(transformBefore);
    expect(svg.style.transform).toContain("scale(-1,");

    click(flipBtn);
    expect(svg.style.transform).toBe(transformBefore);
  });

  test("the vertical flip button mirrors the drawing along y and back", () => {
    init();
    const root = document.getElementById(OVERLAY_ID)!;
    const svg = root.querySelector("svg")!;
    const flipBtn = root.querySelector<HTMLElement>(
      '[data-action="flip-vertical"]',
    )!;
    // default state is already flipped vertically, so the first click un-flips it
    expect(svg.style.transform).toContain("-1)");

    click(flipBtn);
    expect(svg.style.transform).toContain("scale(1, 1)");

    click(flipBtn);
    expect(svg.style.transform).toContain("scale(1, -1)");
  });

  test("the rotate button turns the overlay 90deg, clamped to fit the viewport", () => {
    init();
    const root = document.getElementById(OVERLAY_ID)!;
    const rotateBtn = root.querySelector<HTMLElement>('[data-action="rotate"]')!;

    // full-viewport-width landscape overlay: swapping dimensions naively
    // would make it 1000px tall, well past the 800px viewport
    click(rotateBtn);

    expect(parseFloat(root.style.height)).toBeLessThanOrEqual(800);
    expect(parseFloat(root.style.width)).toBeLessThanOrEqual(1000);
  });

  test("the close button removes the overlay", () => {
    init();
    const root = document.getElementById(OVERLAY_ID)!;
    const closeBtn = root.querySelector<HTMLElement>('[data-action="close"]')!;

    click(closeBtn);

    expect(document.getElementById(OVERLAY_ID)).toBeNull();
  });

  test("dragging an edge strip freely repositions the overlay", () => {
    init();
    const root = document.getElementById(OVERLAY_ID)!;
    const strip = root.querySelectorAll<HTMLElement>(
      'div[style*="cursor: move"]',
    )[0]!;

    strip.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 100, clientY: 100, bubbles: true }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 140, clientY: 70, bubbles: true }),
    );
    window.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 140, clientY: 70, bubbles: true }),
    );

    expect(root.style.transform).toContain(
      "translate(calc(-50% + 40px), calc(-50% + -30px))",
    );
  });

  test("reopening after close resets the offset to zero (viewport-centered)", () => {
    init();
    let root = document.getElementById(OVERLAY_ID)!;
    const strip = root.querySelectorAll<HTMLElement>(
      'div[style*="cursor: move"]',
    )[0]!;
    strip.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 0, clientY: 0, bubbles: true }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 500, clientY: 500, bubbles: true }),
    );
    window.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 500, clientY: 500, bubbles: true }),
    );
    expect(root.style.transform).toContain(
      "translate(calc(-50% + 500px), calc(-50% + 500px))",
    );

    init(); // close
    init(); // reopen
    root = document.getElementById(OVERLAY_ID)!;
    expect(root.style.transform).toContain(
      "translate(calc(-50% + 0px), calc(-50% + 0px))",
    );
  });
});
