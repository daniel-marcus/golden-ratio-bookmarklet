import { PHI } from "./geometry";

/** Quarter turns clockwise applied to the spiral drawing. */
export type Rotation = 0 | 1 | 2 | 3;

export interface OverlayState {
  width: number;
  height: number;
  rotation: Rotation;
  /**
   * Horizontal mirror of the spiral drawing. Combined with rotate(), this
   * reaches all 8 orientations of the spiral (4 turns x mirrored or not) --
   * a second flip axis would be redundant, since mirroring both axes is
   * just a 180deg rotation.
   */
  flipped: boolean;
  /** offset of the overlay's center from the viewport's center, in pixels */
  offsetX: number;
  offsetY: number;
  /**
   * Whether the user has manually resized the overlay. While false, rotate()
   * recomputes the viewport-maximized size for the new rotation instead of
   * swapping the current dimensions, so alternating rotates settle back on
   * the default size instead of shrinking further each time.
   */
  resized: boolean;
}

const DEFAULT_MIN_SIZE = 40;

/**
 * Picks the largest golden rectangle that fits inside the viewport,
 * oriented to match the viewport's own aspect (landscape stays wide;
 * portrait, e.g. a phone held upright, gets the 90deg-turned version).
 */
export function defaultState(viewportWidth: number, viewportHeight: number): OverlayState {
  const isLandscape = viewportWidth >= viewportHeight;

  // Rotation 2 (landscape) / 3 (portrait) land the spiral's large square
  // along the bottom edge; combined with the default flip, this matches the
  // common golden-spiral illustration.
  if (isLandscape) {
    const width = Math.min(viewportWidth, viewportHeight * PHI);
    return {
      width,
      height: width / PHI,
      rotation: 2,
      flipped: true,
      offsetX: 0,
      offsetY: 0,
      resized: false,
    };
  }

  const height = Math.min(viewportHeight, viewportWidth * PHI);
  return {
    width: height / PHI,
    height,
    rotation: 3,
    flipped: true,
    offsetX: 0,
    offsetY: 0,
    resized: false,
  };
}

/** Freely repositions the overlay by the given deltas; never clamped. */
export function move(state: OverlayState, dx: number, dy: number): OverlayState {
  return { ...state, offsetX: state.offsetX + dx, offsetY: state.offsetY + dy };
}

/**
 * Turns the spiral drawing a further 90deg clockwise (a true rotation of the
 * drawing itself, not a re-derived layout), then clamps the resulting
 * bounding box to fit the viewport. A landscape box necessarily becomes a
 * portrait one (and vice versa) once turned a quarter circle -- without
 * clamping, a landscape overlay that covers the full viewport width becomes,
 * once turned, taller than the viewport itself, stranding the overlay (and
 * its controls) out of view.
 */
export function rotate(
  state: OverlayState,
  viewportWidth: number,
  viewportHeight: number,
): OverlayState {
  const rotation = ((state.rotation + 1) % 4) as Rotation;
  const isLandscape = rotation % 2 === 0;

  // Untouched sizing tracks the viewport, not the previous rotation's
  // (possibly clamped) dimensions -- otherwise alternating rotates ratchet
  // the overlay smaller and smaller instead of settling on the default size.
  if (!state.resized) {
    if (isLandscape) {
      const width = Math.min(viewportWidth, viewportHeight * PHI);
      return { ...state, width, height: width / PHI, rotation };
    }

    const height = Math.min(viewportHeight, viewportWidth * PHI);
    return { ...state, width: height / PHI, height, rotation };
  }

  if (isLandscape) {
    const width = Math.min(state.height, viewportWidth, viewportHeight * PHI);
    return { ...state, width, height: width / PHI, rotation };
  }

  const height = Math.min(state.width, viewportHeight, viewportWidth * PHI);
  return { ...state, width: height / PHI, height, rotation };
}

export function flipHorizontal(state: OverlayState): OverlayState {
  return { ...state, flipped: !state.flipped };
}

export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

/**
 * Sign of the offset shift needed, per axis, to keep the corner opposite the
 * given one anchored in place while resizing.
 */
export const CORNER_SIGN: Record<Corner, { x: 1 | -1; y: 1 | -1 }> = {
  "top-left": { x: -1, y: -1 },
  "top-right": { x: 1, y: -1 },
  "bottom-left": { x: -1, y: 1 },
  "bottom-right": { x: 1, y: 1 },
};

/**
 * Resizes the overlay by dragging one of its four corners, keeping the
 * opposite corner anchored in place. `newSize` is the current rotation's
 * dominant dimension (width when landscape, height when portrait); the other
 * dimension follows via PHI.
 */
export function resizeFromCorner(
  state: OverlayState,
  corner: Corner,
  newSize: number,
  minSize = DEFAULT_MIN_SIZE,
): OverlayState {
  const size = Math.max(newSize, minSize);
  const isLandscape = state.rotation % 2 === 0;
  const width = isLandscape ? size : size / PHI;
  const height = isLandscape ? size / PHI : size;
  const sign = CORNER_SIGN[corner];
  const offsetX = state.offsetX + (sign.x * (width - state.width)) / 2;
  const offsetY = state.offsetY + (sign.y * (height - state.height)) / 2;
  return { ...state, width, height, offsetX, offsetY, resized: true };
}
