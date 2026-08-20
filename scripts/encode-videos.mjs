// Re-encodes the landing-page hero videos from media-src/ masters into
// public/videos/. Requires ffmpeg on PATH. Re-run with `pnpm encode:videos`.
// IMPORTANT: /videos/* is served with `immutable` caching — never change the
// bytes behind an existing filename. Bump the -vN suffix instead.
import sharp from "sharp"
import { spawnSync } from "node:child_process"
import { mkdir, stat, readFile, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SRC_DIR = path.join(ROOT, "media-src")
const OUT_DIR = path.join(ROOT, "public", "videos")
const FORCE = process.argv.includes("--force")

// Slide 3 currently ships the original /videos/hero.mp4 untouched — it is
// NOT re-encoded by this script. To re-encode it from media-src/hero-original.mp4,
// uncomment the entry below, but it MUST land under a new filename
// (e.g. amaala-v1.mp4) since hero.mp4's bytes are immutable at their URL.
// CRF values below were picked empirically, not guessed: CRF 23 (the naive
// "hero.mp4-equivalent quality" starting point) produced 7.6-13.6 Mbps on this
// footage -- real handheld/GoPro detail costs far more bits per CRF step than
// hero.mp4's content did. Frame-by-frame comparison at CRF 30 / CRF 26 showed
// no visible difference from CRF 23, so those are the shipped values.
const SLIDES = [
  {
    id: "hero-v2",
    master: "hero-v2-master.mp4",
    crf: 30,
    maxrate: "3400k",
    bufsize: "6800k",
  },
  {
    // Requested range was 23s-50s (27s); at matching quality that ran 9-12 MB.
    // Trimmed to 23s-37s (14s): the subject drifts out of the mobile
    // object-cover crop window from ~t15s onward in the 23-40s cut, so this
    // fixes framing as well as size -- confirmed clean throughout via
    // frame-by-frame review at both mobile and desktop crop widths.
    id: "redsea-v1",
    master: "redsea-v1-master.mp4",
    crf: 26,
    ss: 23,
    t: 14,
    maxrate: "3000k",
    bufsize: "6000k",
  },
  // { id: "amaala-v1", master: "hero-original.mp4", crf: 23, enabled: false },
]

function checkFfmpeg() {
  const result = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" })
  if (result.error?.code === "ENOENT") {
    console.error(
      "ffmpeg not found on PATH — install it (winget install Gyan.FFmpeg) and re-run pnpm encode:videos",
    )
    process.exitCode = 1
    return false
  }
  return true
}

async function exists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

/**
 * @param {{ id: string; master: string; crf: number; ss?: number; t?: number; maxrate?: string; bufsize?: string }} slide
 */
async function encodeVideo(slide) {
  const outPath = path.join(OUT_DIR, `${slide.id}.mp4`)
  const masterPath = path.join(SRC_DIR, slide.master)

  if (!(await exists(masterPath))) {
    console.log(`skip ${slide.id}: ${path.relative(ROOT, masterPath)} not found`)
    return false
  }

  if (!FORCE && (await exists(outPath))) {
    console.log(`skip ${slide.id}.mp4: already exists (use --force to re-encode)`)
    return true
  }
  if (FORCE) {
    console.log(
      `--force: re-encoding ${slide.id}.mp4 in place. Remember this is only safe if the file` +
        " hasn't shipped to real users yet — otherwise bump the -vN suffix instead.",
    )
  }

  const args = ["-hide_banner", "-y"]
  if (slide.ss != null) args.push("-ss", String(slide.ss))
  args.push("-i", masterPath)
  if (slide.t != null) args.push("-t", String(slide.t))
  args.push(
    "-map",
    "0:v:0",
    "-an",
    "-vf",
    "scale=1080:-2:flags=lanczos+accurate_rnd:out_range=tv,format=yuv420p,setsar=1",
    "-r",
    "30",
    "-fps_mode",
    "cfr",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    String(slide.crf),
  )
  if (slide.maxrate) args.push("-maxrate", slide.maxrate)
  if (slide.bufsize) args.push("-bufsize", slide.bufsize)
  args.push(
    "-profile:v",
    "high",
    "-level:v",
    "4.0",
    "-refs",
    "4",
    "-g",
    "60",
    "-keyint_min",
    "30",
    "-colorspace",
    "bt709",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-color_range",
    "tv",
    "-movflags",
    "+faststart",
    outPath,
  )

  const result = spawnSync("ffmpeg", args, { stdio: "inherit" })
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed encoding ${slide.id}.mp4 (exit ${result.status})`)
  }

  const { size } = await stat(outPath)
  console.log(`wrote public/videos/${slide.id}.mp4 (${(size / 1024 / 1024).toFixed(2)} MB)`)
  return true
}

/** @param {{ id: string }} slide */
async function extractPoster(slide) {
  const videoPath = path.join(OUT_DIR, `${slide.id}.mp4`)
  const posterPath = path.join(OUT_DIR, `${slide.id}-poster.jpg`)

  if (!(await exists(videoPath))) {
    console.log(`skip ${slide.id}-poster.jpg: ${slide.id}.mp4 not found`)
    return
  }
  if (!FORCE && (await exists(posterPath))) {
    console.log(`skip ${slide.id}-poster.jpg: already exists (use --force to regenerate)`)
    return
  }

  const framePath = path.join(OUT_DIR, `.${slide.id}-frame.png`)
  const result = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-y", "-i", videoPath, "-frames:v", "1", "-update", "1", "-f", "image2", "-pix_fmt", "rgb24", framePath],
    { stdio: "inherit" },
  )
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed extracting poster frame for ${slide.id} (exit ${result.status})`)
  }

  const png = await readFile(framePath)
  await sharp(png)
    .jpeg({ quality: 72, mozjpeg: true, chromaSubsampling: "4:2:0", progressive: false })
    .toFile(posterPath)
  await rm(framePath, { force: true })

  const { size } = await stat(posterPath)
  console.log(`wrote public/videos/${slide.id}-poster.jpg (${(size / 1024).toFixed(1)} KB)`)
}

async function main() {
  if (!checkFfmpeg()) return

  await mkdir(OUT_DIR, { recursive: true })

  for (const slide of SLIDES) {
    if (slide.enabled === false) continue
    const encoded = await encodeVideo(slide)
    if (encoded) await extractPoster(slide)
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
