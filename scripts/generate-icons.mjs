// Rasterizes public/logo.svg into the PNG icon set the PWA manifest and
// iOS home-screen metadata reference. Re-run with `pnpm icons` whenever the
// logo changes.
import sharp from "sharp"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC = path.join(ROOT, "public", "logo.svg")
const OUT_DIR = path.join(ROOT, "public")
const BACKGROUND = "#ffffff"

/**
 * @param {{ size: number; contentScale: number; outFile: string }} opts
 */
async function renderIcon({ size, contentScale, outFile }) {
  const contentSize = Math.round(size * contentScale)

  // The source SVG's viewBox has a lot of empty margin baked in around the
  // artwork, so trim it to the actual ink before scaling — otherwise the
  // logo renders tiny in the middle of the icon instead of filling it.
  const logo = await sharp(SRC, { density: 384 })
    .trim()
    .resize({ width: contentSize, height: contentSize, fit: "inside" })
    .png()
    .toBuffer()
  const logoMeta = await sharp(logo).metadata()
  const logoWidth = logoMeta.width ?? contentSize
  const logoHeight = logoMeta.height ?? contentSize

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([
      {
        input: logo,
        left: Math.round((size - logoWidth) / 2),
        top: Math.round((size - logoHeight) / 2),
      },
    ])
    .png()
    .toFile(path.join(OUT_DIR, outFile))

  console.log(`wrote public/${outFile} (${size}x${size})`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  await renderIcon({ size: 192, contentScale: 0.82, outFile: "icon-192.png" })
  await renderIcon({ size: 512, contentScale: 0.82, outFile: "icon-512.png" })
  // Android's maskable safe zone is the inner ~80% circle — keep content well inside it.
  await renderIcon({
    size: 512,
    contentScale: 0.6,
    outFile: "icon-maskable-512.png",
  })
  await renderIcon({ size: 180, contentScale: 0.8, outFile: "apple-touch-icon.png" })
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
