// MapLibre derives its Web Worker URL from `import.meta.url`, assuming
// `maplibre-gl-worker.mjs` sits next to the main bundle. Turbopack/webpack
// emit the main bundle into `_next/static/chunks/` without that sibling, so
// the worker 404s, every tile request hangs forever, and the map renders as a
// blank background with no error surfaced.
//
// Copying the worker (and the shared chunk it imports) into `public/` lets us
// point `setWorkerUrl()` at a stable, always-present path. Runs on postinstall
// so the copies track the installed maplibre-gl version.
//
// The copies are published as `.js`, not `.mjs`: Vercel's CDN serves `.mjs`
// from `public/` as `application/octet-stream`, and browsers refuse to start a
// module worker (or import its shared chunk) without a JavaScript MIME type.
// `next start` serves `.mjs` correctly, so that failure only shows up in
// production. The worker's import of the shared chunk is rewritten to match.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SRC_DIR = join(ROOT, "node_modules", "maplibre-gl", "dist")
const OUT_DIR = join(ROOT, "public", "maplibre")

const WORKER = "maplibre-gl-worker"
const SHARED = "maplibre-gl-shared"

if (!existsSync(SRC_DIR)) {
  console.warn("[maplibre] dist not found, skipping worker copy")
  process.exit(0)
}

await mkdir(OUT_DIR, { recursive: true })

const worker = await readFile(join(SRC_DIR, `${WORKER}.mjs`), "utf8")
const sharedImport = `"./${SHARED}.mjs"`
if (!worker.includes(sharedImport)) {
  throw new Error(
    `[maplibre] ${WORKER}.mjs no longer imports ${sharedImport}; update scripts/copy-maplibre-worker.mjs`,
  )
}
await writeFile(
  join(OUT_DIR, `${WORKER}.js`),
  worker.replaceAll(sharedImport, `"./${SHARED}.js"`),
)
await writeFile(
  join(OUT_DIR, `${SHARED}.js`),
  await readFile(join(SRC_DIR, `${SHARED}.mjs`)),
)

// Drop copies left over from when these were published as `.mjs`.
for (const name of [WORKER, SHARED]) {
  await rm(join(OUT_DIR, `${name}.mjs`), { force: true })
}

console.log("[maplibre] copied worker files to public/maplibre")
