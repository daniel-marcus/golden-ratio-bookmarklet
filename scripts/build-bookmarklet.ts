/** Bundles and minifies the bookmarklet into a `javascript:` URI. */
export async function buildBookmarkletUri(): Promise<string> {
  const result = await Bun.build({
    entrypoints: ["./src/bookmarklet-entry.ts"],
    target: "browser",
    format: "iife",
    minify: true,
  });
  const [output] = result.outputs;
  if (!output) throw new Error("bookmarklet build produced no output");
  const code = await output.text();
  return `javascript:${encodeURIComponent(code)}`;
}
