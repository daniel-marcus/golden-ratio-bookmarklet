import { describe, expect, test } from "bun:test";
import { PHI, computeSpiralSquares, squareToArc, squareToCircle } from "./geometry";

describe("computeSpiralSquares", () => {
  test("cuts the first square from the short side of a landscape rect", () => {
    const squares = computeSpiralSquares(0, 0, PHI, 1, 0.001);
    expect(squares[0]).toBeDefined();
    expect(squares[0]!.x).toBeCloseTo(0);
    expect(squares[0]!.y).toBeCloseTo(0);
    expect(squares[0]!.size).toBeCloseTo(1);
    expect(squares[0]!.cut).toBe(0);
  });

  test("cycles through all four sides (left, bottom, right, top) in order", () => {
    const squares = computeSpiralSquares(0, 0, PHI, 1, 0.0001);
    for (let i = 0; i < squares.length; i++) {
      expect(squares[i]!.cut).toBe((i % 4) as 0 | 1 | 2 | 3);
    }
  });

  test("consecutive squares shrink by a factor of 1/PHI", () => {
    const squares = computeSpiralSquares(0, 0, PHI, 1, 0.0001);
    for (let i = 1; i < squares.length; i++) {
      expect(squares[i]!.size / squares[i - 1]!.size).toBeCloseTo(1 / PHI, 5);
    }
  });

  test("every square stays within the original rect bounds", () => {
    const x0 = 10;
    const y0 = 20;
    const w = PHI * 200;
    const h = 200;
    const squares = computeSpiralSquares(x0, y0, w, h, 1);
    for (const sq of squares) {
      expect(sq.x).toBeGreaterThanOrEqual(x0 - 1e-6);
      expect(sq.y).toBeGreaterThanOrEqual(y0 - 1e-6);
      expect(sq.x + sq.size).toBeLessThanOrEqual(x0 + w + 1e-6);
      expect(sq.y + sq.size).toBeLessThanOrEqual(y0 + h + 1e-6);
    }
  });

  test("recursion stops once the square side falls below minSize", () => {
    const squares = computeSpiralSquares(0, 0, PHI * 100, 100, 5);
    for (const sq of squares) {
      expect(sq.size).toBeGreaterThanOrEqual(5);
    }
    const last = squares[squares.length - 1]!;
    expect(last.size / PHI).toBeLessThan(5);
  });

  test("works for a portrait rect (height/width = PHI), starting on a height-reducing side", () => {
    const squares = computeSpiralSquares(0, 0, 1, PHI, 0.001);
    expect(squares[0]!.size).toBeCloseTo(1);
    expect(squares[0]!.cut === 1 || squares[0]!.cut === 3).toBe(true);
  });

  test("handles a plain square input (degenerate, single square)", () => {
    const squares = computeSpiralSquares(0, 0, 50, 50, 1);
    expect(squares.length).toBe(1);
    expect(squares[0]!.size).toBeCloseTo(50);
  });

  test("the arcs of consecutive squares connect into one continuous curve", () => {
    for (const [w, h] of [
      [PHI, 1],
      [1, PHI],
      [PHI * 300, 300],
      [300, PHI * 300],
    ] as const) {
      const squares = computeSpiralSquares(0, 0, w, h, 0.5);
      for (let i = 0; i < squares.length - 1; i++) {
        const arc = squareToArc(squares[i]!);
        const nextArc = squareToArc(squares[i + 1]!);
        expect(arc.toX).toBeCloseTo(nextArc.fromX, 6);
        expect(arc.toY).toBeCloseTo(nextArc.fromY, 6);
      }
    }
  });
});

describe("squareToArc", () => {
  test("cut=0 (left): centers at the top-right corner, sweeping top-left to bottom-right", () => {
    const arc = squareToArc({ x: 0, y: 0, size: 10, cut: 0 });
    expect(arc.cx).toBeCloseTo(10);
    expect(arc.cy).toBeCloseTo(0);
    expect(arc.r).toBeCloseTo(10);
    expect(arc.fromX).toBeCloseTo(0);
    expect(arc.fromY).toBeCloseTo(0);
    expect(arc.toX).toBeCloseTo(10);
    expect(arc.toY).toBeCloseTo(10);
  });

  test("cut=1 (bottom): centers at the top-left corner, sweeping bottom-left to top-right", () => {
    const arc = squareToArc({ x: 0, y: 0, size: 10, cut: 1 });
    expect(arc.cx).toBeCloseTo(0);
    expect(arc.cy).toBeCloseTo(0);
    expect(arc.fromX).toBeCloseTo(0);
    expect(arc.fromY).toBeCloseTo(10);
    expect(arc.toX).toBeCloseTo(10);
    expect(arc.toY).toBeCloseTo(0);
  });

  test("cut=2 (right): centers at the bottom-left corner, sweeping bottom-right to top-left", () => {
    const arc = squareToArc({ x: 0, y: 0, size: 10, cut: 2 });
    expect(arc.cx).toBeCloseTo(0);
    expect(arc.cy).toBeCloseTo(10);
    expect(arc.fromX).toBeCloseTo(10);
    expect(arc.fromY).toBeCloseTo(10);
    expect(arc.toX).toBeCloseTo(0);
    expect(arc.toY).toBeCloseTo(0);
  });

  test("cut=3 (top): centers at the bottom-right corner, sweeping top-right to bottom-left", () => {
    const arc = squareToArc({ x: 0, y: 0, size: 10, cut: 3 });
    expect(arc.cx).toBeCloseTo(10);
    expect(arc.cy).toBeCloseTo(10);
    expect(arc.fromX).toBeCloseTo(10);
    expect(arc.fromY).toBeCloseTo(0);
    expect(arc.toX).toBeCloseTo(0);
    expect(arc.toY).toBeCloseTo(10);
  });

  test("both endpoints are exactly one radius from the center, for every cut type", () => {
    for (const cut of [0, 1, 2, 3] as const) {
      const arc = squareToArc({ x: -3, y: 7, size: 12, cut });
      const dFrom = Math.hypot(arc.fromX - arc.cx, arc.fromY - arc.cy);
      const dTo = Math.hypot(arc.toX - arc.cx, arc.toY - arc.cy);
      expect(dFrom).toBeCloseTo(arc.r);
      expect(dTo).toBeCloseTo(arc.r);
    }
  });
});

describe("squareToCircle", () => {
  test("is centered in the middle of the square with half its side as radius", () => {
    const circle = squareToCircle({ x: 0, y: 0, size: 10, cut: 0 });
    expect(circle.cx).toBeCloseTo(5);
    expect(circle.cy).toBeCloseTo(5);
    expect(circle.r).toBeCloseTo(5);
  });
});
