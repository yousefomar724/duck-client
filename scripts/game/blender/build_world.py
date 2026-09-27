"""Builds scripts/game/.build/world.glb (optimised into public/game/models/) — terrain, landmarks and horizon.

    blender -b --factory-startup -P scripts/game/blender/build_world.py

Inputs come from scripts/game/build-map.mjs:
  scripts/game/.build/terrain.bin/.json   height + biome grid
  public/game/data/map.json               landmark sites and facing

The .blend is saved next to the build output so an artist can open it,
adjust, and re-export by hand if they want to go beyond the generator.
"""

import json
import math
import os
import random
import sys

import bpy
import numpy as np
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
from lib import BUILD_DIR, C, ROOT, MeshBuilder, bake_ao, export_glb, hex_color, mix, reset_scene, shade, vertex_color_material  # noqa: E402

DECIMATE_RATIO = 0.11


def game_to_blender(x, y, z):
    """three.js (x, y, z) → Blender (X, Y, Z)."""
    return (x, -z, y)


# ---------------------------------------------------------------------------
# Terrain


def load_terrain():
    with open(os.path.join(BUILD_DIR, "terrain.json")) as f:
        meta = json.load(f)
    nx, nz = meta["nx"], meta["nz"]
    raw = np.fromfile(os.path.join(BUILD_DIR, "terrain.bin"), dtype=np.uint8)
    heights = np.frombuffer(raw[: nx * nz * 4].tobytes(), dtype=np.float32).reshape(nz, nx)
    biome = raw[nx * nz * 4 :].reshape(nz, nx)
    return meta, heights, biome


def build_terrain(meta, heights, biome):
    nx, nz, cell = meta["nx"], meta["nz"], meta["cell"]
    min_x, min_z = meta["minX"], meta["minZ"]

    ii, jj = np.meshgrid(np.arange(nx), np.arange(nz))
    xs = min_x + ii * cell
    zs = min_z + jj * cell
    verts = np.stack([xs, -zs, heights], axis=-1).reshape(-1, 3).astype(np.float32)

    # Quads, wound counter-clockwise seen from above (+Z).
    a = (jj[:-1, :-1] * nx + ii[:-1, :-1]).ravel()
    quads = np.stack([a, a + nx, a + nx + 1, a + 1], axis=-1)
    # Drop quads that are entirely deep under water: the river shader hides
    # them anyway and they are a third of the grid.
    qmax = heights.ravel()[quads].max(axis=1)
    quads = quads[qmax > -3.2]

    used = np.unique(quads)
    remap = np.full(verts.shape[0], -1, dtype=np.int64)
    remap[used] = np.arange(used.size)
    verts = verts[used]
    quads = remap[quads]

    me = bpy.data.meshes.new("terrain")
    me.vertices.add(verts.shape[0])
    me.vertices.foreach_set("co", verts.ravel())
    me.loops.add(quads.size)
    me.loops.foreach_set("vertex_index", quads.ravel().astype(np.int32))
    me.polygons.add(quads.shape[0])
    me.polygons.foreach_set("loop_start", np.arange(0, quads.size, 4, dtype=np.int32))
    me.update()
    me.validate()
    obj = bpy.data.objects.new("terrain", me)
    bpy.context.scene.collection.objects.link(obj)
    print(f"terrain grid: {len(me.polygons)} quads")

    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("decimate", "DECIMATE")
    mod.ratio = DECIMATE_RATIO
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print(f"terrain decimated: {len(me.polygons)} faces")

    paint_terrain(obj, meta, heights, biome)
    return obj


def paint_terrain(obj, meta, heights, biome):
    me = obj.data
    nx, nz, cell = meta["nx"], meta["nz"], meta["cell"]
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    co = co.reshape(n, 3)
    nrm = np.empty(n * 3, dtype=np.float32)
    me.vertex_normals.foreach_get("vector", nrm)
    up = nrm.reshape(n, 3)[:, 2]

    gi = np.clip(np.round((co[:, 0] - meta["minX"]) / cell).astype(int), 0, nx - 1)
    gj = np.clip(np.round((-co[:, 1] - meta["minZ"]) / cell).astype(int), 0, nz - 1)
    b = biome[gj, gi]
    h = co[:, 2]
    # Cheap deterministic per-vertex noise.
    noise = (np.sin(co[:, 0] * 12.9898 + co[:, 1] * 78.233) * 43758.5453) % 1.0

    def col(name):
        return np.array(C(name)[:3], dtype=np.float32)

    def hexc(h_):
        return np.array(hex_color(h_)[:3], dtype=np.float32)

    B = {k: v for k, v in [("RIVERBED", 0), ("SAND", 1), ("DESERT", 2), ("GREEN", 3), ("GRANITE", 4), ("CITY", 5), ("VILLAGE", 6), ("RUINS", 7)]}
    base = np.zeros((n, 3), dtype=np.float32)
    lerp = lambda c1, c2, t: c1[None, :] * (1 - t[:, None]) + c2[None, :] * t[:, None]  # noqa: E731

    t = noise
    table = {
        B["RIVERBED"]: lerp(hexc("#9c8358"), hexc("#5e6b52"), np.clip(-h / 3, 0, 1)),
        B["SAND"]: lerp(hexc("#e8d2a0"), hexc("#d9bb85"), t),
        B["DESERT"]: lerp(hexc("#e3aa62"), hexc("#efc488"), np.clip(h / 30, 0, 1) * 0.7 + t * 0.3),
        B["GREEN"]: lerp(hexc("#3f7a33"), hexc("#6d9c3e"), t),
        B["GRANITE"]: lerp(hexc("#4a3d3b"), hexc("#7a5a4a"), t),
        B["CITY"]: lerp(hexc("#d2c7b3"), hexc("#bdb19b"), t),
        B["VILLAGE"]: lerp(hexc("#cfa574"), hexc("#b98b5b"), t),
        B["RUINS"]: lerp(hexc("#e6d3a6"), hexc("#d2b88a"), t),
    }
    for k, v in table.items():
        mask = b == k
        base[mask] = v[mask]

    # Steep faces show bare rock/earth; the Corniche wall reads as stone.
    steep = np.clip((0.75 - up) / 0.35, 0, 1)
    rock = np.where((b == B["CITY"])[:, None], hexc("#b8a78a")[None, :], hexc("#b0773f")[None, :])
    rock = np.where((b == B["GRANITE"])[:, None], hexc("#3b302f")[None, :], rock)
    base = base * (1 - steep[:, None]) + rock * steep[:, None]
    # Wet sand band just above the waterline.
    wet = np.clip(1 - np.abs(h - 0.15) / 0.5, 0, 1) * (b != B["GRANITE"]) * (b != B["CITY"])
    base = base * (1 - wet[:, None] * 0.55) + hexc("#a88a5c")[None, :] * (wet[:, None] * 0.55)

    rgba = np.concatenate([base, np.ones((n, 1), dtype=np.float32)], axis=1)
    attr = me.color_attributes.new("Color", "FLOAT_COLOR", "POINT")
    attr.data.foreach_set("color", rgba.ravel())
    me.color_attributes.active_color = attr
    me.materials.append(vertex_color_material())


def terrain_height(meta, heights, x, z):
    cell = meta["cell"]
    fi = min(max((x - meta["minX"]) / cell, 0), meta["nx"] - 1.001)
    fj = min(max((z - meta["minZ"]) / cell, 0), meta["nz"] - 1.001)
    i, j = int(fi), int(fj)
    tx, tz = fi - i, fj - j
    a, b = heights[j, i], heights[j, i + 1]
    c, d = heights[j + 1, i], heights[j + 1, i + 1]
    return float(a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz)


# ---------------------------------------------------------------------------
# Landmarks (authored facing -Y = toward the water after rotation)


def place(mb_fn, site, yaw, name):
    mb = MeshBuilder()
    mb_fn(mb)
    obj = mb.to_object(name)
    obj.location = game_to_blender(site["x"], site["y"], site["z"])
    obj.rotation_euler = (0, 0, yaw)
    return obj


def aga_khan(mb):
    stone = C("pink_sandstone")
    light = mix(stone, C("cream"), 0.35)
    mb.box((20, 20, 1.2), loc=(0, 0, 0.2), color=C("sandstone"))
    mb.box((17, 17, 1.0), loc=(0, 0, 1.2), color=C("sandstone"))
    mb.box((13, 13, 8), loc=(0, 0, 5.6), color=stone)
    for k in range(9):
        t = -6 + k * 1.5
        for s in (-1, 1):
            mb.box((0.7, 0.7, 0.8), loc=(t, s * 6.5, 10), color=light)
            mb.box((0.7, 0.7, 0.8), loc=(s * 6.5, t, 10), color=light)
    # Tall entrance arch on the river side.
    mb.box((4.2, 0.6, 6.5), loc=(0, -6.6, 4.9), color=light)
    mb.box((2.8, 0.7, 5.2), loc=(0, -6.7, 4.2), color=mix(stone, C("black"), 0.45))
    mb.cylinder(4.0, 4.0, 2.2, loc=(0, 0, 10.7), color=light, segs=16)
    mb.dome(4.0, loc=(0, 0, 11.8), color=stone, segs=16, rings=5, height=4.6)
    mb.cylinder(0.25, 0.1, 1.4, loc=(0, 0, 17.0), color=C("cream"), segs=6)
    for s in (-1, 1):
        for t in (-1, 1):
            mb.box((2.4, 2.4, 9.5), loc=(s * 5.8, t * 5.8, 5.9), color=stone)
            mb.dome(1.3, loc=(s * 5.8, t * 5.8, 10.65), color=light, segs=8, rings=3)


def nilometer(mb):
    stone = C("sandstone")
    # Stairs run from the bank (y=+) down into the river (y=-).
    for k in range(10):
        mb.box((3.2, 1.3, 0.5), loc=(0, 3.5 - k * 1.25, 1.6 - k * 0.42), color=mix(stone, C("granite_light"), 0.1 * (k % 2)))
    for s in (-1, 1):
        mb.box((0.9, 13.5, 3.2), loc=(s * 2.1, -2.2, 0.4), color=mix(stone, C("black"), 0.12))
    mb.box((6, 4, 3.4), loc=(0, 6, 1.7), color=stone)
    mb.box((4.6, 0.3, 2.6), loc=(0, 3.9, 1.8), color=mix(stone, C("black"), 0.4))


def khnum(mb):
    stone = C("sandstone")
    rng = random.Random(41)
    mb.box((24, 16, 1.2), loc=(0, 0, 0.3), color=mix(stone, C("cream"), 0.2))
    mb.box((18, 11, 0.8), loc=(0, 0, 1.2), color=stone)
    for r in range(3):
        for c in range(6):
            hgt = rng.uniform(1.2, 5.5)
            mb.cylinder(0.65, 0.6, hgt, loc=(-7.5 + c * 3, -3 + r * 3, 1.6 + hgt / 2), color=mix(stone, C("cream"), rng.uniform(0, 0.3)), segs=8)
            if hgt > 4.5:
                mb.box((1.7, 1.7, 0.5), loc=(-7.5 + c * 3, -3 + r * 3, 1.6 + hgt + 0.25), color=stone)
    # Gateway pylon facing the river.
    for s in (-1, 1):
        mb.box((3.2, 2.2, 7.5), loc=(s * 3.2, -7.2, 4.5), color=stone)
    mb.box((9.6, 2.4, 1.2), loc=(0, -7.2, 8.6), color=mix(stone, C("cream"), 0.3))
    for _ in range(10):
        mb.box((rng.uniform(1, 2.4), rng.uniform(0.8, 1.6), rng.uniform(0.6, 1.2)),
               loc=(rng.uniform(-11, 11), rng.uniform(-7, 7), 1.5), color=stone, rot=(0, 0, rng.uniform(0, 3)))


def old_cataract(mb):
    rust = hex_color("#b5533a")
    cream = C("cream")
    mb.box((30, 12, 1.5), loc=(0, 0, 0.5), color=C("granite_warm"))
    mb.box((28, 10, 10), loc=(0, 1, 6.2), color=rust)
    for f in range(3):
        z = 3.2 + f * 3
        for k in range(11):
            x = -12.5 + k * 2.5
            mb.box((1.1, 0.2, 1.8), loc=(x, -4.05, z), color=cream)
            mb.box((0.8, 0.25, 1.4), loc=(x, -4.1, z - 0.1), color=C("window"))
    mb.box((29, 11, 0.8), loc=(0, 1, 11.5), color=cream)
    # River-side terrace with its famous view.
    mb.box((24, 5, 0.5), loc=(0, -6.5, 1.6), color=cream)
    for k in range(9):
        mb.cylinder(0.25, 0.25, 2.6, loc=(-11 + k * 2.75, -8.8, 2.9), color=cream, segs=6)
    mb.box((24, 0.5, 0.35), loc=(0, -8.8, 4.3), color=cream)
    # Moorish dome over the corner restaurant.
    mb.cylinder(3.2, 3.2, 2.5, loc=(11, 1, 12.9), color=rust, segs=12)
    mb.dome(3.2, loc=(11, 1, 14.1), color=cream, segs=12, rings=4, height=3.6)


def botanical(mb):
    wood = C("wood")
    # A landing jetty and gate for the island garden.
    mb.box((3.2, 11, 0.35), loc=(0, -5, 0.8), color=wood)
    for k in range(5):
        for s in (-1, 1):
            mb.cylinder(0.14, 0.14, 2.2, loc=(s * 1.4, -9.5 + k * 2.2, -0.2), color=C("wood_dark"), segs=5)
    for s in (-1, 1):
        mb.box((0.9, 0.9, 4), loc=(s * 2.4, 1.2, 2), color=C("cream"))
    mb.box((5.7, 0.9, 0.9), loc=(0, 1.2, 4.3), color=C("nubian_green"))


def build_landmarks(meta, heights, landmarks):
    objs = []
    for lm in landmarks:
        site = dict(lm["site"])
        yaw = lm["faceYaw"]
        kind = lm["model"]
        if kind == "agaKhan":
            objs.append(place(aga_khan, site, yaw, lm["id"]))
        elif kind == "nilometer":
            site["y"] = 0.0
            objs.append(place(nilometer, site, yaw, lm["id"]))
        elif kind == "khnum":
            objs.append(place(khnum, site, yaw, lm["id"]))
        elif kind == "oldCataract":
            objs.append(place(old_cataract, site, yaw, lm["id"]))
        elif kind == "botanical":
            # The jetty sits at the island's edge nearest the nest.
            nest = lm["nest"]
            dx, dz = nest["x"] - site["x"], nest["z"] - site["z"]
            d = math.hypot(dx, dz)
            edge = {"x": nest["x"] - dx / d * 9, "z": nest["z"] - dz / d * 9}
            edge["y"] = max(0.4, terrain_height(meta, heights, edge["x"], edge["z"]))
            objs.append(place(botanical, edge, yaw, lm["id"]))
        elif kind == "tombs":
            objs.extend(build_tombs(meta, heights, lm))
    return objs


def build_tombs(meta, heights, lm):
    """Qubbet el-Hawa: rock tombs cut into the hillside, a sheikh's dome on top."""
    site = lm["site"]
    # Summit: the highest point near the site.
    best = (site["x"], site["z"], -1e9)
    for r in range(0, 70, 3):
        for a in range(0, 360, 15):
            x = site["x"] + math.cos(math.radians(a)) * r
            z = site["z"] + math.sin(math.radians(a)) * r
            h = terrain_height(meta, heights, x, z)
            if h > best[2]:
                best = (x, z, h)
    objs = []

    def dome(mb):
        mb.box((4.2, 4.2, 2.6), loc=(0, 0, 1.0), color=C("white"))
        mb.cylinder(1.8, 1.8, 0.8, loc=(0, 0, 2.6), color=C("white"), segs=12)
        mb.dome(1.9, loc=(0, 0, 3.0), color=C("white"), segs=12, rings=4, height=2.4)
        mb.box((1.1, 0.3, 1.8), loc=(0, -2.15, 0.9), color=C("duck_navy"))

    objs.append(place(dome, {"x": best[0], "y": best[2] - 0.3, "z": best[1]}, lm["faceYaw"], "qubbetElHawa"))

    # Tomb doorways along the slope between the summit and the river.
    mb = MeshBuilder()
    fx, fz = math.sin(lm["faceYaw"]), math.cos(lm["faceYaw"])  # toward the water
    sx, sz = fz, -fx  # along the slope
    for k in range(-5, 6):
        for tier, dist in enumerate((34, 48)):
            x = best[0] + fx * dist + sx * k * 6
            z = best[1] + fz * dist + sz * k * 6
            h = terrain_height(meta, heights, x, z)
            if h < 3:
                continue
            p = Vector(game_to_blender(x, h + 0.9, z))
            yaw = lm["faceYaw"]
            mb.box((2.4, 1.4, 2.6), loc=p + Vector((0, 0, 0.3)), color=mix(C("sandstone"), C("cream"), 0.2), rot=(0, 0, yaw))
            mb.box((1.3, 1.5, 1.9), loc=p + Vector((0, 0, 0.1)), color=mix(C("black"), C("wood_dark"), 0.3), rot=(0, 0, yaw))
    # The long stairway from the landing up to the tombs.
    for k in range(18):
        t = k / 17
        dist = 58 - t * 30
        x = best[0] + fx * (dist + 12) - sx * 2
        z = best[1] + fz * (dist + 12) - sz * 2
        h = terrain_height(meta, heights, x, z)
        mb.box((2.6, 2.4, 0.5), loc=Vector(game_to_blender(x, h + 0.1, z)), color=C("sandstone"), rot=(0, 0, lm["faceYaw"]))
    obj = mb.to_object("tombs")
    objs.append(obj)
    return objs


# ---------------------------------------------------------------------------
# Horizon: desert hills around the world edge, seamless with the terrain


def build_horizon(meta, heights):
    rng = random.Random(9)
    nx, nz, cell = meta["nx"], meta["nz"], meta["cell"]
    x0, z0 = meta["minX"], meta["minZ"]
    x1, z1 = x0 + (nx - 1) * cell, z0 + (nz - 1) * cell
    step = 12
    ring = []
    # Walk the rectangle clockwise (in game coords).
    x = x0
    while x < x1:
        ring.append((x, z0))
        x += step
    z = z0
    while z < z1:
        ring.append((x1, z))
        z += step
    x = x1
    while x > x0:
        ring.append((x, z1))
        x -= step
    z = z1
    while z > z0:
        ring.append((x0, z))
        z -= step

    mb = MeshBuilder()
    rows = []
    for (x, z) in ring:
        d = math.hypot(x, z)
        ux, uz = x / d, z / d
        h_edge = terrain_height(meta, heights, x, z)
        river = h_edge < 0.2
        mid_r = max(d + 260, 950)
        far_r = 1900
        n1 = math.sin(ux * 7.1 + uz * 3.3) * 0.5 + math.sin(ux * 17.3 - uz * 11.1) * 0.3 + rng.uniform(-0.2, 0.2)
        mid_h = -1.2 if river else 6 + 10 * (0.5 + 0.5 * n1) + (10 if x < 0 else 0)
        far_h = 70 + 55 * (0.5 + 0.5 * math.sin(ux * 5.3 + uz * 9.7)) + rng.uniform(-10, 10)
        rows.append([
            mb.bm.verts.new(game_to_blender(x, h_edge, z)),
            mb.bm.verts.new(game_to_blender(ux * mid_r, mid_h, uz * mid_r)),
            mb.bm.verts.new(game_to_blender(ux * far_r, far_h, uz * far_r)),
        ])
    n = len(rows)
    for k in range(n):
        a, b = rows[k], rows[(k + 1) % n]
        west = a[0].co.x < 0
        for lvl in range(2):
            f = mb.bm.faces.new((a[lvl], b[lvl], b[lvl + 1], a[lvl + 1]))
            avg_h = sum(v.co.z for v in f.verts) / 4
            if lvl == 0:
                c = C("sand") if west else hex_color("#cfc3ab")
                if avg_h < 0:
                    c = hex_color("#6b7a5a")
            else:
                c = mix(hex_color("#d49a5c"), hex_color("#b9825a"), min(1, avg_h / 110))
            mb._paint([f], c)
    obj = mb.to_object("horizon")
    return obj


# ---------------------------------------------------------------------------


def main():
    reset_scene()
    meta, heights, biome = load_terrain()
    with open(os.path.join(ROOT, "public", "game", "data", "map.json")) as f:
        game_map = json.load(f)

    terrain = build_terrain(meta, heights, biome)
    landmark_objs = build_landmarks(meta, heights, game_map["landmarks"])

    # Join landmarks into one mesh (one draw call in the browser).
    bpy.ops.object.select_all(action="DESELECT")
    for o in landmark_objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = landmark_objs[0]
    bpy.ops.object.join()
    landmarks = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    landmarks.name = "landmarks"

    horizon = build_horizon(meta, heights)
    shade(terrain, 70)
    shade(landmarks, 35)
    shade(horizon, 80)
    # Baked occlusion: gullies, cliff feet, the tomb doorways, under domes and arcades.
    bake_ao([landmarks], distance=2.5, strength=0.7, samples=24)
    bake_ao([terrain], distance=8.0, strength=0.55, samples=12)
    objs = [terrain, landmarks, horizon]
    for o in objs:
        print(f"{o.name:10s} {len(o.data.polygons):6d} faces")
    export_glb(os.path.join(BUILD_DIR, "world.glb"), objs)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BUILD_DIR, "world.blend"))


main()
