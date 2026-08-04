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
    const flipBtn = root.querySelector<HTMLElement>('[data-action="flip-horizontal"]')!;
    const transformBefore = svg.style.transform;

    click(flipBtn);
    expect(svg.style.transform).not.toBe(transformBefore);
    expect(svg.style.transform).toContain("scale(-1,");

    click(flipBtn);
    expect(svg.style.transform).toBe(transformBefore);
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

  test("the rotate button is a true 90deg turn: four clicks visit four distinct angles and return to the start", () => {
    init();
    const root = document.getElementById(OVERLAY_ID)!;
    const svg = root.querySelector("svg")!;
    const rotateBtn = root.querySelector<HTMLElement>('[data-action="rotate"]')!;

    const angles = [svg.style.transform.match(/rotate\((\d+)deg\)/)![1]];
    for (let i = 0; i < 4; i++) {
      click(rotateBtn);
      angles.push(svg.style.transform.match(/rotate\((\d+)deg\)/)![1]);
    }

    expect(new Set(angles.slice(0, 4)).size).toBe(4);
    expect(angles[4]).toBe(angles[0]);
  });

  test("the flip button's glyph tracks whether the current rotation mirrors left-right or top-bottom on screen", () => {
    init();
    const root = document.getElementById(OVERLAY_ID)!;
    const flipBtn = root.querySelector<HTMLElement>('[data-action="flip-horizontal"]')!;
    const rotateBtn = root.querySelector<HTMLElement>('[data-action="rotate"]')!;

    // default state is landscape (even rotation): flip mirrors left-right on screen
    expect(flipBtn.textContent).toBe("⇆");

    // one turn makes it portrait (odd rotation): the same flip toggle now
    // mirrors top-bottom on screen, so the glyph must switch to match
    click(rotateBtn);
    expect(flipBtn.textContent).toBe("⇅");

    click(rotateBtn);
    expect(flipBtn.textContent).toBe("⇆");
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
    const strip = root.querySelectorAll<HTMLElement>('div[style*="cursor: move"]')[0]!;

    strip.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 100, clientY: 100, bubbles: true }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 140, clientY: 70, bubbles: true }),
    );
    window.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 140, clientY: 70, bubbles: true }),
    );

    expect(root.style.transform).toContain("translate(calc(-50% + 40px), calc(-50% + -30px))");
  });

  test("dragging a corner handle resizes the overlay, anchoring the opposite corner", () => {
    init();
    const root = document.getElementById(OVERLAY_ID)!;
    const startWidth = parseFloat(root.style.width);
    const startHeight = parseFloat(root.style.height);
    const handle = Array.from(root.querySelectorAll<HTMLElement>("div")).find(
      (el) => el.style.top === "-8px" && el.style.left === "-8px",
    )!;

    handle.dispatchEvent(
      new PointerEvent("pointerdown", { clientX: 0, clientY: 0, bubbles: true }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: -40, clientY: 0, bubbles: true }),
    );
    window.dispatchEvent(
      new PointerEvent("pointerup", { clientX: -40, clientY: 0, bubbles: true }),
    );

    const width = parseFloat(root.style.width);
    const height = parseFloat(root.style.height);
    expect(width).toBeCloseTo(startWidth + 40);
    expect(height).toBeCloseTo(width / PHI);

    const match = root.style.transform.match(
      /translate\(calc\(-50% \+ ([-\d.]+)px\), calc\(-50% \+ ([-\d.]+)px\)\)/,
    )!;
    const offsetX = parseFloat(match[1]!);
    const offsetY = parseFloat(match[2]!);
    // dragging the top-left handle anchors the bottom-right corner in place
    expect(offsetX + width / 2).toBeCloseTo(0 + startWidth / 2);
    expect(offsetY + height / 2).toBeCloseTo(0 + startHeight / 2);
  });

  test("batches resize renders into a single animation frame during a fast drag", () => {
    const rafCallbacks: FrameRequestCallback[] = [];
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    }) as typeof requestAnimationFrame;

    try {
      init();
      const root = document.getElementById(OVERLAY_ID)!;
      const startWidth = parseFloat(root.style.width);
      const handle = Array.from(root.querySelectorAll<HTMLElement>("div")).find(
        (el) => el.style.bottom === "-8px" && el.style.right === "-8px",
      )!;

      handle.dispatchEvent(
        new PointerEvent("pointerdown", { clientX: 0, clientY: 0, bubbles: true }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 10, clientY: 0, bubbles: true }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 20, clientY: 0, bubbles: true }),
      );
      window.dispatchEvent(
        new PointerEvent("pointermove", { clientX: 30, clientY: 0, bubbles: true }),
      );

      // three pointermoves should coalesce into exactly one scheduled frame,
      // and the DOM should not reflect any resize until that frame runs
      expect(rafCallbacks.length).toBe(1);
      expect(parseFloat(root.style.width)).toBeCloseTo(startWidth);

      rafCallbacks[0]!(0);

      expect(parseFloat(root.style.width)).toBeCloseTo(startWidth + 30);
    } finally {
      window.requestAnimationFrame = originalRaf;
    }
  });

  test("reopening after close resets the offset to zero (viewport-centered)", () => {
    init();
    let root = document.getElementById(OVERLAY_ID)!;
    const strip = root.querySelectorAll<HTMLElement>('div[style*="cursor: move"]')[0]!;
    strip.dispatchEvent(new PointerEvent("pointerdown", { clientX: 0, clientY: 0, bubbles: true }));
    window.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 500, clientY: 500, bubbles: true }),
    );
    window.dispatchEvent(
      new PointerEvent("pointerup", { clientX: 500, clientY: 500, bubbles: true }),
    );
    expect(root.style.transform).toContain("translate(calc(-50% + 500px), calc(-50% + 500px))");

    init(); // close
    init(); // reopen
    root = document.getElementById(OVERLAY_ID)!;
    expect(root.style.transform).toContain("translate(calc(-50% + 0px), calc(-50% + 0px))");
  });
});
