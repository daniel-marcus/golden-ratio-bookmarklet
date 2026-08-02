import { buildBookmarkletUri } from "./build-bookmarklet";

const EXAMPLE_HTML_PATH = new URL("../example/index.html", import.meta.url);
const EXAMPLE_ASSETS_DIR = new URL("../example/assets/", import.meta.url);
const OUT_HTML_PATH = new URL("../out/index.html", import.meta.url);
const OUT_ASSETS_DIR = new URL("../out/assets/", import.meta.url);

const INSTALL_LINK_HREF = /(id="install-link"\s+href=")#(")/;
const FRONTEND_SCRIPT_TAG =
  /\s*<script type="module" src="\.\/frontend\.ts"><\/script>\n/;

const bookmarklet = await buildBookmarkletUri();
const source = await Bun.file(EXAMPLE_HTML_PATH).text();

if (!INSTALL_LINK_HREF.test(source)) {
  throw new Error("example/index.html is missing the #install-link anchor");
}

const html = source
  .replace(INSTALL_LINK_HREF, `$1${bookmarklet}$2`)
  .replace(FRONTEND_SCRIPT_TAG, "\n");

await Bun.write(OUT_HTML_PATH, html);
console.log(`Static example page written to out/index.html (${html.length} chars)`);

const glob = new Bun.Glob("**/*");
for await (const relativePath of glob.scan({ cwd: EXAMPLE_ASSETS_DIR.pathname })) {
  const from = new URL(relativePath, EXAMPLE_ASSETS_DIR);
  const to = new URL(relativePath, OUT_ASSETS_DIR);
  await Bun.write(to, Bun.file(from));
}
console.log("Copied example/assets/ to out/assets/");
