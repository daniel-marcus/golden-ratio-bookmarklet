export const PHI = (1 + Math.sqrt(5)) / 2;

/** Which side of its parent rectangle a square was cut from. */
export type Cut = 0 | 1 | 2 | 3; // 0=left, 1=bottom, 2=right, 3=top

export interface Square {
  x: number;
  y: number;
  size: number;
  cut: Cut;
}

export interface Arc {
  cx: number;
  cy: number;
  r: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

/**
 * Whirling-squares construction: repeatedly cuts the largest possible
 * square from a rectangle, leaving a smaller similar rectangle behind.
 * The side cut from rotates left -> bottom -> right -> top -> left ...
 * each step, which is what makes the sequence of squares actually curl
 * around a center point (a spiral) instead of zig-zagging along a
 * diagonal. For a golden rectangle this traces the classic golden spiral.
 */
export function computeSpiralSquares(
  x: number,
  y: number,
  w: number,
  h: number,
  minSize = 1,
): Square[] {
  const squares: Square[] = [];
  let cx = x;
  let cy = y;
  let cw = w;
  let ch = h;
  let cut: Cut = cw >= ch ? 0 : 1;

  while (Math.min(cw, ch) >= minSize) {
    const size = Math.min(cw, ch);
    let square: Square;

    switch (cut) {
      case 0: // left
        square = { x: cx, y: cy, size, cut };
        cx += size;
        cw -= size;
        break;
      case 1: // bottom
        square = { x: cx, y: cy + ch - size, size, cut };
        ch -= size;
        break;
      case 2: // right
        square = { x: cx + cw - size, y: cy, size, cut };
        cw -= size;
        break;
      default: // top
        square = { x: cx, y: cy, size, cut };
        cy += size;
        ch -= size;
        break;
    }

    squares.push(square);
    cut = ((cut + 1) % 4) as Cut;
  }

  return squares;
}

export function squareToArc(square: Square): Arc {
  const { x, y, size: s, cut } = square;
  const TL = { x, y };
  const TR = { x: x + s, y };
  const BL = { x, y: y + s };
  const BR = { x: x + s, y: y + s };

  switch (cut) {
    case 0:
      return { cx: TR.x, cy: TR.y, r: s, fromX: TL.x, fromY: TL.y, toX: BR.x, toY: BR.y };
    case 1:
      return { cx: TL.x, cy: TL.y, r: s, fromX: BL.x, fromY: BL.y, toX: TR.x, toY: TR.y };
    case 2:
      return { cx: BL.x, cy: BL.y, r: s, fromX: BR.x, fromY: BR.y, toX: TL.x, toY: TL.y };
    default:
      return { cx: BR.x, cy: BR.y, r: s, fromX: TR.x, fromY: TR.y, toX: BL.x, toY: BL.y };
  }
}

export function squareToCircle(square: Square): Circle {
  const { x, y, size } = square;
  return {
    cx: x + size / 2,
    cy: y + size / 2,
    r: size / 2,
  };
}
