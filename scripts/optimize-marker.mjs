// Downscales public/duck-marker.png (the 500x500 master) into the small WebP
// the map actually renders. Re-run with `pnpm marker` if the master changes.
//
// The marker draws at 32px (44px when selected) in src/components/map/MapView.tsx,
// so 88px covers a 2x display. Shipping the master meant a 119 KB PNG for a
// 32px image, once per marker on the map.
//
// IMPORTANT: public/sw.js stale-while-revalidates images, so a content change
// must ship under a new filename or returning visitors keep the old bytes.
import sharp from "sharp"
import { stat } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.join(ROOT, "public", "duck-marker.png")
const SIZE = 88
const OUT = path.join(ROOT, "public", `duck-marker-${SIZE}.webp`)

async function main() {
  await sharp(SRC)
    .resize({ width: SIZE, height: SIZE, fit: "inside" })
    .webp({ quality: 88, effort: 6, alphaQuality: 100 })
    .toFile(OUT)

  const { size } = await stat(OUT)
  console.log(`wrote public/${path.basename(OUT)} (${SIZE}x${SIZE}, ${(size / 1024).toFixed(1)} KB)`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
