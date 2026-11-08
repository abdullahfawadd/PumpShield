import { copyFile, mkdir } from "node:fs/promises";
// MapLibre 6 uses an ES module worker with a sibling shared module.
// Serve the exact installed version locally; never depend on an unpinned CDN worker.
await mkdir(new URL("../public/maplibre/", import.meta.url), {
  recursive: true,
});
for (const name of [
  "maplibre-gl-worker.mjs",
  "maplibre-gl-shared.mjs",
  "LICENSE.txt",
]) {
  const source =
    name === "LICENSE.txt"
      ? new URL("../node_modules/maplibre-gl/LICENSE.txt", import.meta.url)
      : new URL(`../node_modules/maplibre-gl/dist/${name}`, import.meta.url);
  await copyFile(
    source,
    new URL(`../public/maplibre/${name}`, import.meta.url),
  );
}
