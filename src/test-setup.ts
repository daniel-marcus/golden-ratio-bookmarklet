import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

// happy-dom's document is a single global shared across every test file in
// this process, so anything appended to document.body in one test would
// otherwise leak into the next (e.g. a stale #golden-ratio-bookmarklet-overlay
// element making a later createOverlay() test flaky).
afterEach(() => {
  document.body.innerHTML = "";
});
