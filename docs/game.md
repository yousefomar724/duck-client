# Duckling Rescue — the Duck kayak game

A mobile-first 3D game at **`/play`**. The player paddles a kayak around Elephantine Island in Aswan, collects lost ducklings (they line up behind the kayak) and leads them into glowing nests to bank points before sunset. It is `noindex` and not linked from the site yet; it will be integrated into the landing page (with points and gifts) once it has been played and approved.

## How it plays

- **Paddle controls (default):** tap the left half of the screen to paddle on the left, which turns the kayak right. Tap the right half to paddle on the right. Alternate, or hold both, to go straight. Keyboard: `←`/`→` (or `A`/`D`) to paddle, `↑`/`W`/`Space` to cruise, `Esc`/`P` to pause.
- **Joystick controls (optional):** drag anywhere and the paddler chooses the strokes for you.
- **Scoring:** each duckling in the line is worth 10 points, and a golden duckling is worth 5 regular ones. The line multiplier is `1 + 0.1 × (n − 1)`, capped at ×3, so longer lines are worth more. Discovering a landmark gives +50.
- **Risk:** hitting a granite boulder, a boat or the bank hard scatters the back 30% of the line.
- **Run length:** 120 s. The run starts in late-afternoon light and ends at dusk, with the sun setting over the west-bank dunes.
- **Onboarding:** the start is placed so that three ducklings lead straight into the Nubian-village nest, which teaches the whole loop in the first five seconds.

All tuning numbers live in [`src/game/core/tuning.ts`](../src/game/core/tuning.ts).

## Code layout

```
src/app/play/page.tsx           route (noindex), lazy-loads the game client-side only
src/game/core/                  deterministic simulation — no three.js, no DOM
  sim.ts                        fixed 60 Hz step, seeded RNG, input log
  sdf.ts, rng.ts, tuning.ts, types.ts
src/game/runtime/               fixed-step clock, input controller, data loading
src/game/render/                react-three-fiber scene (sky, water shader, world, kayak, ducks, boats, effects, camera)
src/game/ui/                    HUD, minimap, touch controls, menus, zustand store
src/game/audio/sfx.ts           WebAudio-synthesised sounds (no audio files)
tests/unit/game-sim.test.ts     sim + map-data tests
```

The sim is deterministic: the same map, seed and input log always produce the same score. `SimState.inputLog` records every input change. **This is the foundation for points and gifts:** the client submits `{seed, inputLog}`, and the server replays the run with the same `src/game/core` code to recompute the score, so forged scores are rejected.

## Asset pipeline

```bash
pnpm game:build      # map data → Blender props → Blender world → meshopt-compressed GLBs
pnpm game:osm        # re-fetch OpenStreetMap river/islands (only to pick up OSM edits)
pnpm game:tripo      # generate Tripo drafts (needs TRIPO_API_KEY and account credits)
```

1. **`scripts/game/fetch-osm.mjs`** saves the Nile river polygon and its islands from OpenStreetMap to `scripts/game/data/osm-river.json`. The file is committed, so builds work offline.
2. **`scripts/game/build-map.mjs`** reads that data together with [`map-config.mjs`](../scripts/game/map-config.mjs), which holds the real landmark coordinates, zones and felucca lanes. It produces:
   - `public/game/data/map.json`: landmarks, nests, rocks, boats, routes and prop placements.
   - `public/game/data/sdf.bin`: a shoreline distance field, used for both collision and the water shader.
   - A terrain grid for Blender.

   Pass `--debug out.png` to get a top-down render with a lat/lon grid.
3. **`scripts/game/textures.mjs`** draws the foliage textures (date-palm fronds, doum-palm fans, leaf clusters) as SVG and rasterises them to PNG.
4. **`scripts/game/blender/build_props.py`** builds every prop in code. It covers:
   - rubber ducklings and reed nests
   - feluccas (after Duck's reference photo, with a boatman and passengers), water taxis (bunting, torus life rings, outboard, driver) and cruise boats
   - date palms and doum palms (alpha-cut leaf cards) and broadleaf and flame trees
   - Nubian houses (plaster, arched doors, shutters, painted motifs, bougainvillea) and Egyptian city blocks (balconies, AC units, rooftop rebar)
   - the Mövenpick tower, granite boulders (desert varnish, wet waterline) and camels
   - Corniche lamps, railings and benches, and reeds

   Every prop gets smooth/sharp normals and **Cycles-baked ambient occlusion** in its vertex colours. Houses, blocks, palms and trees also get a decimated `~lod` twin for distance.
5. **`scripts/game/blender/build_player.py`** builds the player:
   - a detailed touring kayak (hatches, bungees, coaming, spray skirt)
   - a rigged kayaker modelled on `public/kayak.webp`
   - IK arms that follow the paddle, baked into `Paddle` and `Idle` clips; the game scrubs `Paddle` with the sim's stroke phase
6. **`scripts/game/blender/build_world.py`** builds the terrain, the landmarks (Aga Khan Mausoleum, Tombs of the Nobles with Qubbet el-Hawa, Nilometer, Temple of Khnum, Old Cataract Hotel, Botanical Garden jetty) and the horizon, all with baked AO.
7. `build.mjs` then welds, quantises and meshopt-compresses the GLBs into `public/game/models/`: props about 1.8 MB (including textures), world about 690 KB, player about 130 KB.

### Rendering

- PBR materials throughout: a glossy duckling, satin boat paint and a matte world.
- A sun that casts real shadows, with the shadow box following the kayak.
- A sky environment map for reflections.
- See-through shallows over the riverbed.
- A world-space grain on the terrain.

Props are instanced in 150-unit chunks so off-screen chunks are frustum-culled. Small props stop drawing at distance, and houses, blocks, palms and trees switch to their LODs beyond about 200 units. `PerformanceMonitor` lowers the pixel ratio on slow devices and, as a last resort, turns real-time shadows off.

On a 2015 Intel HD 530 the game holds about 30 fps during play at 1500×938. Phones should be profiled before launch.

### 3D Jutsu (Higgsfield connector)

- **Catalog:** stylized low-poly models, so they weren't used for realism. Its rubber duck is the Khronos glTF sample, whose licence is unclear for commercial use.
- **Image-to-3D, rigging and animation:** these need Higgsfield credits (the account had 0).
- **Hosted Blender:** the hero assets (kayaker and kayak, felucca, water taxi, Nubian houses, granite, ducklings, nest) are mirrored into the project "Duck — Duckling Rescue game assets" by running these same builder functions there. Open it at https://higgsfield.ai/3d-jutsu/39d227fe-fd29-46ea-b672-b443d20f875e to orbit, inspect or download the `.blend`/`.glb`.

The `.blend` files are saved to `scripts/game/.build/` (gitignored) so an artist can open them. Preview any `.blend` with:

```bash
blender -b scripts/game/.build/props.blend -P scripts/game/blender/preview.py -- out.png 30 20 0.6 felucca,motorboat
```

### Tripo

`scripts/game/tripo.mjs` requests text-to-3D drafts for the duckling, felucca, camel and cruise boat, and saves them to `scripts/game/assets/tripo/`. When a draft exists, `build_props.py` swaps it in automatically after a clean-up pass:
- decimates it to the face budget
- flattens its texture into per-face palette colours
- matches the hand-built model's size, pivot and orientation

The Blender versions remain as the fallback and the size reference. The Tripo account currently has **0 credits**, so every model is the Blender version for now. After adding credits:

```bash
pnpm game:tripo && pnpm game:build
```

Check the result with `preview.py`. If a draft is worse than the hand-built model, delete its `.glb` and rebuild.

## Next stage: points and gifts

- Add a `POST /api/v1/game/runs` endpoint. It accepts `{seed, inputLog, clientScore}`, replays the run with `createSim` + `step`, and stores the server-computed score.
- Keep an append-only points ledger in Mongo, with daily caps on game points. Store the balance as the sum of the ledger, never as an editable number.
- Redeem points as vouchers through the existing booking flow.
- Future modes, all reusing the same sim:
  - Daily Duck: a fixed seed per day and a share card.
  - Time trial with ghosts.
  - QR check-in on real tours.

Map data © OpenStreetMap contributors (ODbL). The in-game title screen shows this attribution.
