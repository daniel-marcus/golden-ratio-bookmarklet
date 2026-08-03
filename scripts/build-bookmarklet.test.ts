import { beforeEach, describe, expect, test } from "bun:test";
import { OVERLAY_ID } from "../src/overlay-dom";
import { buildBookmarkletUri } from "./build-bookmarklet";

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
});

describe("buildBookmarkletUri", () => {
  test("the actual minified, bundled output shows the overlay when run, and toggles it off on a second run", async () => {
    const uri = await buildBookmarkletUri();
    expect(uri).toStartWith("javascript:");

    const code = decodeURIComponent(uri.slice("javascript:".length));

    eval(code); // oxlint-disable-line no-eval
    expect(document.getElementById(OVERLAY_ID)).not.toBeNull();

    eval(code); // oxlint-disable-line no-eval
    expect(document.getElementById(OVERLAY_ID)).toBeNull();
  });
});
