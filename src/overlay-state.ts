import { PHI } from "./geometry";

export type Orientation = "landscape" | "portrait";

export interface OverlayState {
  width: number;
  height: number;
  orientation: Orientation;
  flippedX: boolean;
  flippedY: boolean;
  /** offset of the overlay's center from the viewport's center, in pixels */
  offsetX: number;
  offsetY: number;
  /**
   * Whether the user has manually resized the overlay. While false, rotate()
   * recomputes the viewport-maximized size for the new orientation instead of
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
export function defaultState(
  viewportWidth: number,
  viewportHeight: number,
): OverlayState {
  const orientation: Orientation =
    viewportWidth >= viewportHeight ? "landscape" : "portrait";

  // Vertically flipped by default: the common golden-spiral illustration
  // has the large square along the bottom, not the top.
  if (orientation === "landscape") {
    const width = Math.min(viewportWidth, viewportHeight * PHI);
    return {
      width,
      height: width / PHI,
      orientation,
      flippedX: false,
      flippedY: true,
      offsetX: 0,
      offsetY: 0,
      resized: false,
    };
  }

  const height = Math.min(viewportHeight, viewportWidth * PHI);
  return {
    width: height / PHI,
    height,
    orientation,
    flippedX: false,
    flippedY: true,
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
 * Turns the overlay 90deg by swapping its dimensions, then clamps the
 * result to fit the viewport. Without this, a landscape overlay that
 * covers the full viewport width becomes, once turned, taller than the
 * viewport itself -- stranding the overlay (and its controls) out of view.
 */
export function rotate(
  state: OverlayState,
  viewportWidth: number,
  viewportHeight: number,
): OverlayState {
  const orientation: Orientation =
    state.orientation === "landscape" ? "portrait" : "landscape";

  // Untouched sizing tracks the viewport, not the previous rotation's
  // (possibly clamped) dimensions -- otherwise alternating rotates ratchet
  // the overlay smaller and smaller instead of settling on the default size.
  if (!state.resized) {
    if (orientation === "landscape") {
      const width = Math.min(viewportWidth, viewportHeight * PHI);
      return { ...state, width, height: width / PHI, orientation };
    }

    const height = Math.min(viewportHeight, viewportWidth * PHI);
    return { ...state, width: height / PHI, height, orientation };
  }

  if (orientation === "landscape") {
    const width = Math.min(state.height, viewportWidth, viewportHeight * PHI);
    return { ...state, width, height: width / PHI, orientation };
  }

  const height = Math.min(state.width, viewportHeight, viewportWidth * PHI);
  return { ...state, width: height / PHI, height, orientation };
}

export function flipHorizontal(state: OverlayState): OverlayState {
  return { ...state, flippedX: !state.flippedX };
}

export function flipVertical(state: OverlayState): OverlayState {
  return { ...state, flippedY: !state.flippedY };
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
 * opposite corner anchored in place. `newSize` is the orientation's dominant
 * dimension (width in landscape, height in portrait); the other dimension
 * follows via PHI.
 */
export function resizeFromCorner(
  state: OverlayState,
  corner: Corner,
  newSize: number,
  minSize = DEFAULT_MIN_SIZE,
): OverlayState {
  const size = Math.max(newSize, minSize);
  const width = state.orientation === "landscape" ? size : size / PHI;
  const height = state.orientation === "landscape" ? size / PHI : size;
  const sign = CORNER_SIGN[corner];
  const offsetX = state.offsetX + (sign.x * (width - state.width)) / 2;
  const offsetY = state.offsetY + (sign.y * (height - state.height)) / 2;
  return { ...state, width, height, offsetX, offsetY, resized: true };
}
