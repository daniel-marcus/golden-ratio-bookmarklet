import { createOverlay, OVERLAY_ID, renderOverlay } from "./overlay-dom";
import {
  defaultState,
  flipHorizontal,
  flipVertical,
  move,
  resizeHeight,
  resizeWidth,
  rotate,
  type OverlayState,
} from "./overlay-state";

function makeButton(label: string, action: string): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.dataset.action = action;
  btn.style.width = "28px";
  btn.style.height = "28px";
  btn.style.border = "1px solid #ff2fb0";
  btn.style.borderRadius = "4px";
  btn.style.background = "transparent";
  btn.style.color = "#ff2fb0";
  btn.style.cursor = "pointer";
  btn.style.fontSize = "14px";
  btn.style.lineHeight = "1";
  return btn;
}

/** Toggles the golden-ratio overlay on the current page. */
export function init(): void {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    existing.remove();
    return;
  }

  const overlay = createOverlay();
  let state: OverlayState = defaultState(window.innerWidth, window.innerHeight);
  renderOverlay(overlay, state);

  const flipHorizontalBtn = makeButton("⇆", "flip-horizontal");
  const flipVerticalBtn = makeButton("⇅", "flip-vertical");
  const rotateBtn = makeButton("⟳", "rotate");
  const closeBtn = makeButton("×", "close");
  overlay.controls.append(flipHorizontalBtn, flipVerticalBtn, rotateBtn, closeBtn);

  flipHorizontalBtn.addEventListener("click", () => {
    state = flipHorizontal(state);
    renderOverlay(overlay, state);
  });

  flipVerticalBtn.addEventListener("click", () => {
    state = flipVertical(state);
    renderOverlay(overlay, state);
  });

  rotateBtn.addEventListener("click", () => {
    state = rotate(state, window.innerWidth, window.innerHeight);
    renderOverlay(overlay, state);
  });

  closeBtn.addEventListener("click", () => {
    overlay.root.remove();
  });

  overlay.handle.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startState = state;

    function onMove(moveEvent: PointerEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      state =
        startState.orientation === "landscape"
          ? resizeWidth(startState, startState.width + dx * 2)
          : resizeHeight(startState, startState.height + dy * 2);
      renderOverlay(overlay, state);
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });

  overlay.dragFrame.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startState = state;

    function onMove(moveEvent: PointerEvent) {
      state = move(startState, moveEvent.clientX - startX, moveEvent.clientY - startY);
      renderOverlay(overlay, state);
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });

  document.body.appendChild(overlay.root);
}
