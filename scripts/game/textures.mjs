// Procedural foliage textures (RGBA PNG with alpha cut-outs), drawn as SVG and
// rasterised with sharp. Blender maps them onto leaf cards and embeds them in
// props.glb; the game renders them with alpha testing.
//
//   node scripts/game/textures.mjs   (run by build.mjs before Blender)

import { mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, ".build", "textures")

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const mix = (a, b, t) => {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16))
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16))
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`
}

/**
 * Date-palm frond: rachis along the middle (u = 0 at the trunk → 1 at the
 * tip), stiff narrow leaflets angled toward the tip on both sides. The top
 * half of the texture is one side of the frond, the bottom half the other.
 */
function frond() {
  const W = 1024
  const H = 256
  const r = rng(7)
  const mid = H / 2
  const shapes = []
  for (const side of [-1, 1]) {
    for (let x = 70; x < W - 12; x += 7 + r() * 4) {
      const u = x / W
      // Leaflets are longest mid-frond and shrink toward base and tip.
      const len = (H / 2 - 4) * Math.sin(Math.PI * (0.1 + 0.86 * u)) ** 0.55 * (0.85 + r() * 0.2)
      const angle = (0.62 + r() * 0.2) * side // radians from the rachis, raked toward the tip
      const ex = x + Math.cos(Math.abs(angle)) * len * 0.7
      const ey = mid + Math.sin(angle) * len
      const w = 6 + r() * 3
      const nx = -Math.sin(angle) * w
      const ny = Math.cos(angle) * w * side
      const shade = mix("46632a", "8aa04a", r() * 0.8 + u * 0.2)
      const tip = mix("6d7f3a", "a9b460", r())
      shapes.push(
        `<path d="M${x},${mid} Q${(x + ex) / 2 + nx},${(mid + ey) / 2 + ny} ${ex},${ey} Q${(x + ex) / 2 - nx * 0.3},${(mid + ey) / 2 - ny * 0.3} ${x + 6},${mid}Z" fill="${shade}"/>`,
      )
      shapes.push(`<line x1="${(x + ex * 2) / 3}" y1="${(mid + ey * 2) / 3}" x2="${ex}" y2="${ey}" stroke="${tip}" stroke-width="1.6" stroke-linecap="round"/>`)
    }
  }
  shapes.push(`<path d="M0,${mid - 5} L${W},${mid - 1} L${W},${mid + 1} L0,${mid + 5}Z" fill="#8a8a4a"/>`)
  return { name: "frond", W, H, svg: shapes.join("") }
}

/** Doum-palm fan leaf: stiff segments radiating from the petiole, split tips. */
function fan() {
  const S = 512
  const r = rng(11)
  const cx = S / 2
  const cy = S - 30
  const shapes = []
  for (let a = -1.35; a <= 1.35; a += 0.075 + r() * 0.02) {
    const len = S * (0.8 + r() * 0.1) * (1 - Math.abs(a) * 0.18)
    const ex = cx + Math.sin(a) * len
    const ey = cy - Math.cos(a) * len
    const w = 7
    const nx = Math.cos(a) * w
    const ny = Math.sin(a) * w
    const c = mix("4d6e33", "8fa655", r())
    shapes.push(`<path d="M${cx - nx * 0.4},${cy - ny * 0.4} L${ex - nx},${ey - ny} L${ex},${ey + 14} L${ex + nx},${ey + ny} L${cx + nx * 0.4},${cy + ny * 0.4}Z" fill="${c}"/>`)
  }
  shapes.push(`<circle cx="${cx}" cy="${cy}" r="18" fill="#5a6a38"/>`)
  return { name: "fan", W: S, H: S, svg: shapes.join("") }
}

/** Broadleaf cluster for tree canopies (Kitchener's Island, Corniche trees). */
function leaves() {
  const S = 512
  const r = rng(23)
  const shapes = []
  for (let i = 0; i < 520; i++) {
    const x = 40 + r() * (S - 80)
    const y = 40 + r() * (S - 80)
    // Keep a rough round silhouette.
    if (Math.hypot(x - S / 2, y - S / 2) > S * 0.46 * (0.75 + r() * 0.3)) continue
    const rot = r() * 360
    const len = 30 + r() * 26
    const c = mix("355b28", "7ea24a", r())
    shapes.push(
      `<g transform="translate(${x},${y}) rotate(${rot})"><path d="M0,0 Q${len * 0.5},${-len * 0.32} ${len},0 Q${len * 0.5},${len * 0.32} 0,0Z" fill="${c}"/><line x1="0" y1="0" x2="${len}" y2="0" stroke="#2c4a20" stroke-width="1"/></g>`,
    )
  }
  return { name: "leaves", W: S, H: S, svg: shapes.join("") }
}

await mkdir(OUT, { recursive: true })
for (const { name, W, H, svg } of [frond(), fan(), leaves()]) {
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`
  await sharp(Buffer.from(doc)).png().toFile(join(OUT, `${name}.png`))
}
console.log(`textures → ${OUT}`)
