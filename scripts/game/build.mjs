// One command for the whole game-asset pipeline:
//
//   1. build-map.mjs        OSM + config → map.json, sdf.bin, terrain grid
//      textures.mjs         palm-frond / fan / leaf textures (SVG → PNG)
//   2. Blender build_props  props.glb   (uses Tripo drafts when present)
//   3. Blender build_world  world.glb   (terrain, landmarks, horizon)
//      Blender build_player player.glb (kayak + rigged, animated kayaker)
//   4. gltf-transform       weld, quantise, meshopt-compress → public/game/models
//
//   pnpm game:build                 # everything
//   pnpm game:build --skip-blender  # just re-optimise / rebuild map data
//
// Blender is found via $BLENDER, then the default Windows/macOS/Linux paths.

import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, stat } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { NodeIO } from "@gltf-transform/core"
import { ALL_EXTENSIONS } from "@gltf-transform/extensions"
import { dedup, meshopt, prune, weld } from "@gltf-transform/functions"
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer"

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, "..", "..")
const BUILD = join(HERE, ".build")
const MODELS = join(ROOT, "public", "game", "models")
const args = new Set(process.argv.slice(2))

function findBlender() {
  const candidates = [
    process.env.BLENDER,
    "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe",
    "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe",
    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe",
    "C:/Program Files/Blender Foundation/Blender 4.5/blender.exe",
    "/Applications/Blender.app/Contents/MacOS/Blender",
    "/usr/bin/blender",
    "/snap/bin/blender",
  ].filter(Boolean)
  const found = candidates.find((p) => existsSync(p))
  if (!found) throw new Error("Blender not found — set BLENDER=/path/to/blender")
  return found
}

function run(cmd, cmdArgs, label) {
  console.log(`\n▶ ${label}`)
  const res = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" })
  const lines = `${res.stdout}\n${res.stderr}`
    .split("\n")
    .filter((l) => l.trim() && !/^\d\d:\d\d:\d\d \| INFO|^Blender \d|^Read blend|^Info:/.test(l))
  console.log(lines.slice(-25).join("\n"))
  if (res.status !== 0 || /Traceback|Error:/.test(res.stderr ?? "")) {
    throw new Error(`${label} failed (exit ${res.status})`)
  }
}

await mkdir(BUILD, { recursive: true })
await mkdir(MODELS, { recursive: true })

run(process.execPath, [join(HERE, "build-map.mjs")], "map data")
run(process.execPath, [join(HERE, "textures.mjs")], "foliage textures")

if (!args.has("--skip-blender")) {
  const blender = findBlender()
  run(blender, ["-b", "--factory-startup", "-P", join(HERE, "blender", "build_props.py")], "Blender: props")
  run(blender, ["-b", "--factory-startup", "-P", join(HERE, "blender", "build_world.py")], "Blender: world")
  run(blender, ["-b", "--factory-startup", "-P", join(HERE, "blender", "build_player.py")], "Blender: kayak + kayaker")
}

console.log("\n▶ optimise GLBs")
await MeshoptEncoder.ready
await MeshoptDecoder.ready
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder })

for (const name of ["props", "world", "player"]) {
  const src = join(BUILD, `${name}.glb`)
  const out = join(MODELS, `${name}.glb`)
  const doc = await io.read(src)
  await doc.transform(dedup(), prune({ keepAttributes: true }), weld(), meshopt({ encoder: MeshoptEncoder, level: "medium" }))
  await io.write(out, doc)
  const [a, b] = await Promise.all([stat(src), stat(out)])
  console.log(`${name}.glb  ${(a.size / 1024).toFixed(0)} KB → ${(b.size / 1024).toFixed(0)} KB`)
}
console.log("\n✓ game assets built")
