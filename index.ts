import exampleHtml from "./example/index.html";

async function buildBookmarklet(): Promise<string> {
  const result = await Bun.build({
    entrypoints: ["./src/bookmarklet-entry.ts"],
    target: "browser",
    format: "iife",
    minify: false,
  });
  const [output] = result.outputs;
  if (!output) throw new Error("bookmarklet build produced no output");
  return output.text();
}

const server = Bun.serve({
  routes: {
    "/": exampleHtml,
    "/bookmarklet.js": async () =>
      new Response(await buildBookmarklet(), {
        headers: { "Content-Type": "application/javascript" },
      }),
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Dev server running at ${server.url}`);
