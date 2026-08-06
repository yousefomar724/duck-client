// MapLibre derives its Web Worker URL from `import.meta.url`, assuming
// `maplibre-gl-worker.mjs` sits next to the main bundle. Turbopack/webpack
// emit the main bundle into `_next/static/chunks/` without that sibling, so
// the worker 404s, every tile request hangs forever, and the map renders as a
// blank background with no error surfaced.
//
// Copying the worker (and the shared chunk it imports) into `public/` lets us
// point `setWorkerUrl()` at a stable, always-present path. Runs on postinstall
// so the copies track the installed maplibre-gl version.
import { copyFile, mkdir } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SRC_DIR = join(ROOT, "node_modules", "maplibre-gl", "dist")
const OUT_DIR = join(ROOT, "public", "maplibre")

// The worker imports "./maplibre-gl-shared.mjs", so both must be served from
// the same directory.
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]

if (!existsSync(SRC_DIR)) {
  console.warn("[maplibre] dist not found, skipping worker copy")
  process.exit(0)
}

await mkdir(OUT_DIR, { recursive: true })
for (const file of FILES) {
  await copyFile(join(SRC_DIR, file), join(OUT_DIR, file))
}
console.log(`[maplibre] copied ${FILES.length} worker files to public/maplibre`)
