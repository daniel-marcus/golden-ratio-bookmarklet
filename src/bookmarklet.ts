import { createOverlay, OVERLAY_ID, renderOverlay } from "./overlay-dom";
import {
  CORNER_SIGN,
  defaultState,
  flipHorizontal,
  move,
  resizeFromCorner,
  rotate,
  type Corner,
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

  // Pointer events can fire far more often than the browser can paint, and
  // renderOverlay rebuilds the whole spiral's SVG nodes -- rendering on every
  // event during a fast drag makes the UI fall behind the cursor. Coalescing
  // into one render per animation frame keeps input handling cheap while
  // rendering only as often as the screen can actually show it.
  let renderScheduled = false;
  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      renderScheduled = false;
      renderOverlay(overlay, state);
    });
  }

  const flipHorizontalBtn = makeButton("⇆", "flip-horizontal");
  const rotateBtn = makeButton("⟳", "rotate");
  const closeBtn = makeButton("×", "close");
  overlay.controls.append(flipHorizontalBtn, rotateBtn, closeBtn);

  // The flip only ever mirrors the drawing's own (pre-rotation) horizontal
  // axis -- once a quarter turn has been applied, that axis appears
  // top-to-bottom on screen instead of left-to-right, so the glyph has to
  // track the current rotation's parity to keep describing what the button
  // actually does.
  function updateFlipIcon() {
    flipHorizontalBtn.textContent = state.rotation % 2 === 0 ? "⇆" : "⇅";
  }
  updateFlipIcon();

  flipHorizontalBtn.addEventListener("click", () => {
    state = flipHorizontal(state);
    renderOverlay(overlay, state);
  });

  rotateBtn.addEventListener("click", () => {
    state = rotate(state, window.innerWidth, window.innerHeight);
    renderOverlay(overlay, state);
    updateFlipIcon();
  });

  closeBtn.addEventListener("click", () => {
    overlay.root.remove();
  });

  for (const corner of Object.keys(overlay.handles) as Corner[]) {
    overlay.handles[corner].addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startState = state;
      const sign = CORNER_SIGN[corner];

      function onMove(moveEvent: PointerEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        const newSize =
          startState.rotation % 2 === 0
            ? startState.width + sign.x * dx
            : startState.height + sign.y * dy;
        state = resizeFromCorner(startState, corner, newSize);
        scheduleRender();
      }

      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        // commit the final position immediately rather than waiting on a
        // possibly-still-pending animation frame
        renderOverlay(overlay, state);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    });
  }

  overlay.dragFrame.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startState = state;

    function onMove(moveEvent: PointerEvent) {
      state = move(startState, moveEvent.clientX - startX, moveEvent.clientY - startY);
      scheduleRender();
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      // commit the final position immediately rather than waiting on a
      // possibly-still-pending animation frame
      renderOverlay(overlay, state);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });

  document.body.appendChild(overlay.root);
}
