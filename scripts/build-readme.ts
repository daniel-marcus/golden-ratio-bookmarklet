import { buildBookmarkletUri } from "./build-bookmarklet";

const README_PATH = new URL("../README.md", import.meta.url);
const START_MARKER = "<!-- BOOKMARKLET:START -->";
const END_MARKER = "<!-- BOOKMARKLET:END -->";

async function updateReadme(bookmarklet: string): Promise<void> {
  const readme = await Bun.file(README_PATH).text();
  const startIdx = readme.indexOf(START_MARKER);
  const endIdx = readme.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `README.md is missing ${START_MARKER} / ${END_MARKER} markers`,
    );
  }

  const block = `${START_MARKER}\n\`\`\`text\n${bookmarklet}\n\`\`\`\n${END_MARKER}`;
  const updated =
    readme.slice(0, startIdx) + block + readme.slice(endIdx + END_MARKER.length);

  await Bun.write(README_PATH, updated);
}

const bookmarklet = await buildBookmarkletUri();
await updateReadme(bookmarklet);
console.log(`Bookmarklet built (${bookmarklet.length} chars) and written to README.md`);
