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

export function resizeWidth(
  state: OverlayState,
  newWidth: number,
  minSize = DEFAULT_MIN_SIZE,
): OverlayState {
  const width = Math.max(newWidth, minSize);
  const height =
    state.orientation === "landscape" ? width / PHI : width * PHI;
  return { ...state, width, height };
}

export function resizeHeight(
  state: OverlayState,
  newHeight: number,
  minSize = DEFAULT_MIN_SIZE,
): OverlayState {
  const height = Math.max(newHeight, minSize);
  const width =
    state.orientation === "landscape" ? height * PHI : height / PHI;
  return { ...state, width, height };
}
