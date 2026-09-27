// Generates draft 3D models with Tripo (text → model). The raw GLBs land in
// scripts/game/assets/tripo/ and are committed; Blender (build_props.py) then
// decimates them, flattens their textures into the game's palette and exports
// the cleaned versions. Re-running skips models that already exist, so credits
// are only spent on new or --force'd assets.
//
//   node --env-file=.env.local scripts/game/tripo.mjs            # all missing
//   node --env-file=.env.local scripts/game/tripo.mjs duckling --force

import { mkdir, writeFile, access } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, "assets", "tripo")
const API = "https://api.tripo3d.ai/v2/openapi"
const MODEL_VERSION = "v3.1-20260211"

const STYLE =
  "stylized low-poly game asset, clean simple shapes, flat solid colours, no text, no logo, single object, centred, no base, no ground plane"
const NEGATIVE = "realistic, photoreal, noisy texture, ground, pedestal, base, stand, text, multiple objects"

/** What we ask Tripo for. Keep prompts short and concrete. */
export const ASSETS = {
  duckling: {
    prompt: `a cute round yellow duckling bath toy floating, big head, small orange beak, tiny black eyes, short tail, ${STYLE}`,
    faceLimit: 1500,
  },
  felucca: {
    prompt: `a traditional Egyptian Nile felucca sailboat, long wooden hull painted white with a blue stripe, one tall slanted mast carrying a huge white triangular lateen sail, ${STYLE}`,
    faceLimit: 3000,
  },
  camel: {
    prompt: `a dromedary camel lying down resting on the sand with folded legs, colourful woven saddle blanket, ${STYLE}`,
    faceLimit: 2500,
  },
  cruiseBoat: {
    prompt: `a long white Nile river cruise ship with three decks of windows, flat roof sun deck with small awnings, ${STYLE}`,
    faceLimit: 3000,
  },
}

const key = process.env.TRIPO_API_KEY
if (!key) {
  console.error("TRIPO_API_KEY is not set. Run with: node --env-file=.env.local scripts/game/tripo.mjs")
  process.exit(1)
}

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.code !== 0) {
    throw new Error(`Tripo ${path}: HTTP ${res.status} ${JSON.stringify(body).slice(0, 300)}`)
  }
  return body.data
}

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  )

async function generate(name, spec) {
  const glbPath = join(OUT_DIR, `${name}.glb`)
  const { task_id } = await api("/task", {
    method: "POST",
    body: JSON.stringify({
      type: "text_to_model",
      model_version: MODEL_VERSION,
      prompt: spec.prompt,
      negative_prompt: NEGATIVE,
      face_limit: spec.faceLimit,
      texture: true,
      pbr: false,
      model_seed: 7,
      texture_seed: 7,
    }),
  })
  console.log(`${name}: task ${task_id}`)

  let task
  const started = Date.now()
  for (;;) {
    await new Promise((r) => setTimeout(r, 5000))
    task = await api(`/task/${task_id}`)
    if (task.status === "success") break
    if (["failed", "banned", "expired", "cancelled", "unknown"].includes(task.status)) {
      throw new Error(`${name}: task ${task.status}`)
    }
    if (Date.now() - started > 15 * 60_000) throw new Error(`${name}: timed out`)
    process.stdout.write(`${name}: ${task.status} ${task.progress ?? 0}%\r`)
  }

  const url = task.output?.pbr_model ?? task.output?.model ?? task.output?.base_model
  if (!url) throw new Error(`${name}: no model URL in ${JSON.stringify(task.output)}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${name}: download failed HTTP ${res.status}`)
  await writeFile(glbPath, Buffer.from(await res.arrayBuffer()))
  await writeFile(
    join(OUT_DIR, `${name}.json`),
    JSON.stringify({ task_id, model_version: MODEL_VERSION, prompt: spec.prompt, createdAt: new Date().toISOString() }, null, 2),
  )
  console.log(`${name}: saved ${glbPath}`)
}

await mkdir(OUT_DIR, { recursive: true })
const force = process.argv.includes("--force")
const requested = process.argv.slice(2).filter((a) => !a.startsWith("--"))
const names = requested.length ? requested : Object.keys(ASSETS)

const results = await Promise.allSettled(
  names.map(async (name) => {
    const spec = ASSETS[name]
    if (!spec) throw new Error(`Unknown asset "${name}"`)
    if (!force && (await exists(join(OUT_DIR, `${name}.glb`)))) {
      console.log(`${name}: already generated (use --force to redo)`)
      return
    }
    await generate(name, spec)
  }),
)
const failed = results.filter((r) => r.status === "rejected")
for (const f of failed) console.error(f.reason?.message ?? f.reason)
process.exit(failed.length ? 1 : 0)
