import { computeSpiralSquares, squareToArc, squareToCircle } from "./geometry";
import type { OverlayState } from "./overlay-state";

export const OVERLAY_ID = "golden-ratio-bookmarklet-overlay";
const SVG_NS = "http://www.w3.org/2000/svg";
const STROKE = "#ff2fb0";
const MIN_SQUARE_PX = 6;

export interface Overlay {
  root: HTMLDivElement;
  svg: SVGSVGElement;
  handle: HTMLDivElement;
  controls: HTMLDivElement;
  dragFrame: HTMLDivElement;
}

const DRAG_STRIP_THICKNESS = 14;

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

export function createOverlay(): Overlay {
  const root = document.createElement("div");
  root.id = OVERLAY_ID;
  root.style.position = "fixed";
  root.style.left = "50%";
  root.style.top = "50%";
  root.style.zIndex = "2147483647";
  root.style.boxSizing = "border-box";
  root.style.border = `1px solid ${STROKE}`;
  root.style.pointerEvents = "none";

  const svg = svgEl("svg");
  svg.style.position = "absolute";
  svg.style.inset = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.overflow = "visible";
  root.appendChild(svg);

  const dragFrame = document.createElement("div");
  dragFrame.style.position = "absolute";
  dragFrame.style.inset = "0";
  dragFrame.style.pointerEvents = "none";
  for (const edge of ["top", "bottom", "left", "right"] as const) {
    const strip = document.createElement("div");
    strip.style.position = "absolute";
    strip.style.pointerEvents = "auto";
    strip.style.cursor = "move";
    if (edge === "top" || edge === "bottom") {
      strip.style[edge] = `${-DRAG_STRIP_THICKNESS / 2}px`;
      strip.style.left = "0";
      strip.style.width = "100%";
      strip.style.height = `${DRAG_STRIP_THICKNESS}px`;
    } else {
      strip.style[edge] = `${-DRAG_STRIP_THICKNESS / 2}px`;
      strip.style.top = "0";
      strip.style.height = "100%";
      strip.style.width = `${DRAG_STRIP_THICKNESS}px`;
    }
    dragFrame.appendChild(strip);
  }
  root.appendChild(dragFrame);

  const handle = document.createElement("div");
  handle.style.position = "absolute";
  handle.style.right = "-8px";
  handle.style.bottom = "-8px";
  handle.style.width = "16px";
  handle.style.height = "16px";
  handle.style.borderRadius = "50%";
  handle.style.background = STROKE;
  handle.style.cursor = "nwse-resize";
  handle.style.pointerEvents = "auto";
  root.appendChild(handle);

  const controls = document.createElement("div");
  controls.style.position = "absolute";
  controls.style.top = "8px";
  controls.style.left = "8px";
  controls.style.display = "flex";
  controls.style.gap = "6px";
  controls.style.padding = "4px";
  controls.style.borderRadius = "6px";
  controls.style.background = "rgba(255, 255, 255, 0.85)";
  controls.style.pointerEvents = "auto";
  root.appendChild(controls);

  return { root, svg, handle, controls, dragFrame };
}

export function renderOverlay(overlay: Overlay, state: OverlayState): void {
  const { root, svg } = overlay;
  root.style.width = `${state.width}px`;
  root.style.height = `${state.height}px`;
  root.style.transform = `translate(calc(-50% + ${state.offsetX}px), calc(-50% + ${state.offsetY}px))`;
  svg.setAttribute("viewBox", `0 0 ${state.width} ${state.height}`);
  svg.style.transform = `scale(${state.flippedX ? -1 : 1}, ${state.flippedY ? -1 : 1})`;

  svg.replaceChildren();

  const minSize = Math.max(MIN_SQUARE_PX, Math.min(state.width, state.height) * 0.015);
  const squares = computeSpiralSquares(0, 0, state.width, state.height, minSize);

  for (const square of squares) {
    const rect = svgEl("rect");
    rect.setAttribute("x", String(square.x));
    rect.setAttribute("y", String(square.y));
    rect.setAttribute("width", String(square.size));
    rect.setAttribute("height", String(square.size));
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", STROKE);
    rect.setAttribute("stroke-width", "1");
    svg.appendChild(rect);

    const arc = squareToArc(square);
    const path = svgEl("path");
    path.setAttribute(
      "d",
      `M ${arc.fromX} ${arc.fromY} A ${arc.r} ${arc.r} 0 0 0 ${arc.toX} ${arc.toY}`,
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", STROKE);
    path.setAttribute("stroke-width", "1.5");
    svg.appendChild(path);

    const circleSpec = squareToCircle(square);
    const circle = svgEl("circle");
    circle.setAttribute("cx", String(circleSpec.cx));
    circle.setAttribute("cy", String(circleSpec.cy));
    circle.setAttribute("r", String(circleSpec.r));
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", STROKE);
    circle.setAttribute("stroke-width", "1");
    circle.setAttribute("stroke-opacity", "0.6");
    svg.appendChild(circle);
  }
}
