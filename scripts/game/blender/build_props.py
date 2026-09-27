"""Builds scripts/game/.build/props.glb (optimised into public/game/models/) — every reusable game model.

    blender -b --factory-startup -P scripts/game/blender/build_props.py

Each prop is a separate named object at the origin, facing Blender -Y
(three.js +Z). The game instances them from map.json placements. Parts that
need a different material (alpha-cut foliage cards) are separate objects named
"<prop>__leaves"; the game draws them wherever it draws the prop.

Realism comes from modelling detail plus two finishing passes on every prop:
smooth/sharp normals by angle, and Cycles-baked ambient occlusion multiplied
into the vertex colours.

Tripo drafts: if scripts/game/assets/tripo/<name>.glb exists (see
scripts/game/tripo.mjs), it replaces the hand-built model for that prop after
a clean-up pass (decimate, flatten texture into palette colours, match size).
"""

import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

sys.path.insert(0, os.path.dirname(__file__))
from lib import (  # noqa: E402
    BUILD_DIR,
    C,
    GAME_SCRIPTS,
    MeshBuilder,
    bake_ao,
    export_glb,
    face_count,
    hex_color,
    mix,
    reset_scene,
    shade,
    vertex_color_material,
)

TRIPO_DIR = os.path.join(GAME_SCRIPTS, "assets", "tripo")
TEX_DIR = os.path.join(BUILD_DIR, "textures")

H = hex_color


def n3(v, scale=1.0, seed=0.0):
    """Perlin noise in [-1, 1] at a point."""
    return noise.noise(Vector((v[0] * scale + seed, v[1] * scale - seed, v[2] * scale + seed * 0.5)))


# ---------------------------------------------------------------------------
# Alpha-cut foliage cards


def textured_material(name, tex):
    mat = bpy.data.materials.get(name)
    if mat:
        return mat
    mat = bpy.data.materials.new(name)
    nt = mat.node_tree
    if nt is None:
        mat.use_nodes = True
        nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    img = bpy.data.images.load(os.path.join(TEX_DIR, f"{tex}.png"), check_existing=True)
    node = nt.nodes.new("ShaderNodeTexImage")
    node.image = img
    nt.links.new(node.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(node.outputs["Alpha"], bsdf.inputs["Alpha"])
    bsdf.inputs["Roughness"].default_value = 0.85
    return mat


class Cards:
    """Textured quads with UVs and a tint colour (glTF multiplies COLOR_0 into the texture)."""

    def __init__(self):
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.col = self.bm.loops.layers.float_color.new("Color")

    def quad(self, p, uvs, tint):
        f = self.bm.faces.new([self.bm.verts.new(q) for q in p])
        for loop, uv in zip(f.loops, uvs):
            loop[self.uv].uv = uv
            loop[self.col] = tint
        return f

    def strip(self, a_pts, b_pts, us, va, vb, tint):
        for i in range(len(a_pts) - 1):
            self.quad(
                [a_pts[i], a_pts[i + 1], b_pts[i + 1], b_pts[i]],
                [(us[i], va), (us[i + 1], va), (us[i + 1], vb), (us[i], vb)],
                tint,
            )

    def to_object(self, name, material):
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        me.materials.append(material)
        me.color_attributes.active_color = me.color_attributes["Color"]
        # The exporter writes the *render* colour attribute as COLOR_0.
        me.color_attributes.render_color_index = me.color_attributes.active_color_index
        obj = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(obj)
        for p in me.polygons:
            p.use_smooth = True
        return obj


# ---------------------------------------------------------------------------
# Hulls


def loft_hull(mb, length, half_width, depth, sheer, color_fn, stations=24, segs=12, bow_rise=0.0, fullness=0.7, stern_full=0.5, transom=0.0):
    """Hull along Y (bow at -Y). color_fn(kind, t, z) picks colours: "hull", "keel", "stripe", "deck"."""
    rings = []
    for i in range(stations + 1):
        t = i / stations
        y = -length / 2 + t * length
        # Pointed bow; the stern is fuller (or cut square with `transom`).
        s = math.sin(math.pi * (t * (1 - transom) + (0 if t < 0.5 else 0)))
        s = max(s, transom * 0.8 * (t ** 3)) if transom else s
        w = half_width * (s ** (fullness if t < 0.5 else stern_full))
        d = depth * (s**0.45)
        rise = bow_rise * ((1 - t) ** 3) + bow_rise * 0.25 * (t**5)
        top = sheer + rise
        if i == 0 or (i == stations and not transom):
            rings.append([mb.bm.verts.new((0, y, top))])
            continue
        ring = []
        for k in range(segs + 1):
            a = math.pi * k / segs
            ring.append(mb.bm.verts.new((math.cos(a) * w, y, top - (math.sin(a) ** 0.85) * d)))
        ring.append(mb.bm.verts.new((0, y, top + 0.08 * w)))
        rings.append(ring)
    n = segs + 2
    for i in range(stations):
        a, b = rings[i], rings[i + 1]
        t = (i + 0.5) / stations
        for k in range(n):
            if len(a) == 1:
                f = mb.bm.faces.new((a[0], b[(k + 1) % n], b[k]))
            elif len(b) == 1:
                f = mb.bm.faces.new((a[k], a[(k + 1) % n], b[0]))
            else:
                f = mb.bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
            z = f.calc_center_median().z
            if k >= segs:
                kind = "deck"
            elif k in (0, segs - 1):
                kind = "stripe"
            else:
                kind = "hull"
            mb._paint([f], color_fn(kind, t, z))
    if transom:
        last = rings[-1]
        mb._paint([mb.bm.faces.new(list(reversed(last)))], color_fn("hull", 1.0, 0.3))


def torus(mb, center, radius, tube, color, axis="X", segs=16, tsegs=8):
    verts = []
    rot = Matrix.Rotation(math.pi / 2, 4, "Y" if axis == "X" else "X")
    for i in range(segs):
        a = i / segs * math.tau
        row = []
        for j in range(tsegs):
            b = j / tsegs * math.tau
            p = Vector(((radius + math.cos(b) * tube) * math.cos(a), (radius + math.cos(b) * tube) * math.sin(a), math.sin(b) * tube))
            row.append(mb.bm.verts.new(Vector(center) + (rot @ p.to_4d()).to_3d()))
        verts.append(row)
    faces = []
    for i in range(segs):
        for j in range(tsegs):
            a, b = verts[i], verts[(i + 1) % segs]
            faces.append(mb.bm.faces.new((a[j], b[j], b[(j + 1) % tsegs], a[(j + 1) % tsegs])))
    mb._paint(faces, color)
    return faces


# ---------------------------------------------------------------------------
# People (sailors, drivers, tourists) — static seated figures


def seated_figure(mb, base, yaw=0.0, robe="#8fb7d6", head_wrap="#f4f1ea", skin="#8a5a3c", arms_forward=0.35, hat=None):
    """A seated person facing -Y (rotated by yaw), sitting on `base` (seat height)."""
    rot = Matrix.Rotation(yaw, 3, "Z")
    o = Vector(base)

    def P(x, y, z):
        return o + rot @ Vector((x, y, z))

    robe_c, skin_c = H(robe), H(skin)
    # Robe/body: hips, torso, shoulders.
    mb.uv_sphere(0.2, loc=P(0, 0.02, 0.12), color=robe_c, segs=12, rings=8, scale=(1.1, 1.0, 0.7))
    mb.capsule(P(0, 0.02, 0.15), P(0, 0.04, 0.55), 0.17, 0.15, robe_c, segs=12)
    # Thighs forward, shins down.
    for s in (-1, 1):
        mb.capsule(P(s * 0.1, 0.0, 0.1), P(s * 0.11, -0.4, 0.12), 0.08, 0.07, robe_c, segs=8)
        mb.capsule(P(s * 0.11, -0.4, 0.12), P(s * 0.11, -0.45, -0.3), 0.065, 0.05, robe_c, segs=8)
        mb.uv_sphere(0.06, loc=P(s * 0.11, -0.52, -0.33), color=H("#3b2a20"), segs=8, rings=5, scale=(0.8, 1.6, 0.6))
        # Arms reach forward (to a tiller, a rail, the lap).
        mb.capsule(P(s * 0.19, 0.04, 0.52), P(s * 0.22, -arms_forward * 0.6, 0.3), 0.055, 0.045, robe_c, segs=8)
        mb.capsule(P(s * 0.22, -arms_forward * 0.6, 0.3), P(s * 0.15, -arms_forward, 0.3), 0.045, 0.038, robe_c, segs=8)
        mb.uv_sphere(0.045, loc=P(s * 0.14, -arms_forward - 0.03, 0.3), color=skin_c, segs=8, rings=6)
    mb.capsule(P(0, 0.04, 0.55), P(0, 0.03, 0.66), 0.05, 0.05, skin_c, segs=8)
    mb.uv_sphere(0.1, loc=P(0, 0.02, 0.76), color=skin_c, segs=14, rings=10, scale=(0.9, 1.0, 1.1))
    if hat == "sunhat":
        mb.cylinder(0.2, 0.2, 0.02, loc=P(0, 0.02, 0.84), color=H(head_wrap), segs=16)
        mb.uv_sphere(0.1, loc=P(0, 0.02, 0.85), color=H(head_wrap), segs=12, rings=6, scale=(1, 1, 0.7))
    else:
        # Emma (turban) wrapped round the head.
        mb.uv_sphere(0.115, loc=P(0, 0.025, 0.82), color=H(head_wrap), segs=14, rings=8, scale=(1.0, 1.05, 0.75))


# ---------------------------------------------------------------------------
# Ducks and nests


def build_duckling():
    """A glossy rubber duckling — Duck's mascot, in the brand yellow."""
    mb = MeshBuilder()
    yellow = C("duck_yellow")
    body = mb.uv_sphere(1.0, loc=(0, 0, 0), color=yellow, segs=20, rings=14)
    for v in {v for f in body for v in f.verts}:
        x, y, z = v.co
        # Rounded body, wider at the chest, tail flicked up at the back (+Y).
        nx, ny, nz = x * 0.36, y * 0.5, z * 0.3
        if y > 0.25:
            nz += (y - 0.25) ** 2 * 0.55
            nx *= 1 - (y - 0.25) * 0.5
        if z < 0:
            nz *= 0.75
        v.co = Vector((nx, ny + 0.04, nz + 0.28))
    mb.uv_sphere(0.235, loc=(0, -0.24, 0.66), color=yellow, segs=18, rings=12, scale=(1.0, 0.98, 1.0))
    mb.uv_sphere(0.16, loc=(0, -0.2, 0.5), color=yellow, segs=16, rings=10, scale=(1.2, 1.0, 0.8))  # neck blend
    beak = C("duck_orange")
    mb.uv_sphere(0.1, loc=(0, -0.45, 0.6), color=beak, segs=16, rings=8, scale=(1.05, 1.3, 0.34))
    mb.uv_sphere(0.085, loc=(0, -0.43, 0.56), color=mix(beak, C("red"), 0.2), segs=14, rings=8, scale=(0.95, 1.2, 0.3))
    for s in (-1, 1):
        mb.uv_sphere(0.045, loc=(s * 0.12, -0.39, 0.72), color=H("#101010"), segs=12, rings=8)
        mb.uv_sphere(0.013, loc=(s * 0.13, -0.425, 0.74), color=H("#ffffff"), segs=6, rings=4)
        mb.uv_sphere(0.2, loc=(s * 0.31, 0.08, 0.36), color=mix(yellow, C("duck_orange"), 0.12), segs=10, rings=8, scale=(0.3, 1.1, 0.6))
    obj = mb.to_object("duckling")
    shade(obj, 60)
    return obj


def build_nest():
    """A floating reed nest with a Duck pennant, visible across the river."""
    mb = MeshBuilder()
    rng = random.Random(8)
    straw = mb.cylinder(1.65, 1.55, 0.22, loc=(0, 0, 0.06), color=C("sand"), segs=24)
    mb.paint_vertices(straw, lambda v: mix(C("sand"), H("#b89458"), 0.5 + 0.5 * n3(v.co, 3.0)))
    # Bundled reeds round the rim.
    for i in range(34):
        a = i / 34 * math.tau + rng.uniform(-0.05, 0.05)
        r = 1.72 + rng.uniform(-0.05, 0.05)
        tan = Vector((-math.sin(a), math.cos(a), 0))
        c = Vector((math.cos(a) * r, math.sin(a) * r, 0.2 + rng.uniform(-0.03, 0.05)))
        mb.capsule(c - tan * 0.22, c + tan * 0.22, 0.1, 0.1, mix(C("wood"), H("#a88a4a"), rng.random()), segs=6)
    # A few reeds sticking up.
    for i in range(10):
        a = rng.uniform(0, math.tau)
        base = Vector((math.cos(a) * 1.6, math.sin(a) * 1.6, 0.2))
        tip = base + Vector((math.cos(a) * 0.3, math.sin(a) * 0.3, rng.uniform(0.7, 1.2)))
        mb.capsule(base, tip, 0.025, 0.01, H("#9a8a4a"), segs=4)
    # Pole and a brand pennant (yellow with a navy band).
    mb.capsule((1.45, 0.3, 0.1), (1.45, 0.3, 4.3), 0.06, 0.045, C("wood_dark"), segs=8)
    mb.uv_sphere(0.09, loc=(1.45, 0.3, 4.35), color=C("duck_yellow"), segs=8, rings=6)
    mb.poly([(1.45, 0.3, 4.2), (1.45, -1.1, 3.85), (1.45, 0.3, 3.4)], C("duck_yellow"))
    mb.poly([(1.46, 0.3, 3.7), (1.46, -0.55, 3.72), (1.46, 0.3, 3.55)], C("duck_navy"))
    obj = mb.to_object("nest")
    shade(obj, 40)
    return obj


# ---------------------------------------------------------------------------
# Boats


def build_felucca():
    """Aswan felucca after Duck's reference photo: low white hull, orange-red
    bottom, a towering cream lateen sail on a steep yard, sun awning, a boatman
    at the tiller and passengers under the awning."""
    mb = MeshBuilder()
    white, wood, wood_dark = C("white"), C("wood"), C("wood_dark")
    bottom = H("#d9542c")

    def col(kind, t, z):
        if kind == "deck":
            return mix(wood, H("#c9a26b"), 0.3)
        if kind == "stripe":
            return H("#1c1c1c")
        if z < 0.18:
            return bottom
        return white

    loft_hull(mb, 9.0, 1.3, 0.85, 0.6, col, stations=26, segs=12, bow_rise=0.95, fullness=0.55, stern_full=0.5)
    # Curved stem post rising at the bow.
    mb.capsule((0, -4.5, 1.1), (0, -4.75, 1.9), 0.07, 0.05, wood_dark, segs=6)
    # Rudder and tiller at the stern.
    mb.box((0.07, 0.55, 1.3), loc=(0, 4.55, 0.2), color=wood_dark, rot=(0.25, 0, 0))
    mb.capsule((0, 4.45, 0.95), (0, 3.4, 1.15), 0.04, 0.035, wood, segs=6)

    # Mast, yard and boom.
    mast_top = Vector((0, -1.2, 6.8))
    mb.capsule((0, -1.0, 0.4), mast_top, 0.11, 0.07, wood_dark, segs=10)
    tack = Vector((0, -4.1, 1.3))
    peak = Vector((0, 2.4, 15.2))
    clew = Vector((0, 4.2, 1.7))
    mb.capsule(tack - (peak - tack).normalized() * 0.4, peak, 0.085, 0.04, wood_dark, segs=8)
    mb.capsule(tack, clew + (clew - tack).normalized() * 0.3, 0.065, 0.05, wood_dark, segs=8)
    # Rigging: forestay, halyard, sheet.
    rope = H("#6b5a44")
    mb.capsule(mast_top, (0, -4.6, 1.8), 0.018, 0.018, rope, segs=4)
    mb.capsule(mast_top, tack.lerp(peak, 0.45), 0.018, 0.018, rope, segs=4)
    mb.capsule(clew, (0.3, 4.0, 1.0), 0.015, 0.015, rope, segs=4)

    # The sail: a bellied triangular grid with seam stripes running up the yard.
    sail = H("#efe6d2")
    rows = 10
    grid = {}
    for i in range(rows + 1):
        for j in range(rows + 1 - i):
            u, v = i / rows, j / rows
            w = 1 - u - v
            p = tack + (peak - tack) * u + (clew - tack) * v
            grid[i, j] = p + Vector((0.55 * 27 * u * v * w, 0, 0))
    for i in range(rows):
        for j in range(rows - i):
            panel = mix(sail, H("#d9ccb0"), 0.35 if j % 3 == 0 else 0.0)
            mb.poly([grid[i, j], grid[i + 1, j], grid[i, j + 1]], panel)
            if (i + 1, j + 1) in grid:
                mb.poly([grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]], panel)

    # Sun awning, benches and cushions.
    canvas = H("#e8dcc2")
    mb.box((2.1, 3.6, 0.06), loc=(0, 1.2, 2.3), color=canvas, bevel=0.02)
    for sx in (-0.95, 0.95):
        for sy in (-0.5, 2.9):
            mb.capsule((sx, sy, 0.7), (sx, sy, 2.3), 0.035, 0.035, wood_dark, segs=5)
    for sx in (-0.75, 0.75):
        mb.box((0.45, 3.2, 0.25), loc=(sx, 1.2, 0.72), color=H("#b33a2e"), bevel=0.06)
    mb.box((1.9, 0.35, 0.4), loc=(0, 2.9, 1.0), color=H("#2f5f8f"), bevel=0.05)

    # The boatman at the tiller, two passengers in the shade.
    seated_figure(mb, (0, 3.55, 0.75), yaw=math.pi, robe="#9cc3dd", head_wrap="#f4f1ea", arms_forward=0.3)
    seated_figure(mb, (-0.72, 0.5, 0.85), yaw=math.pi / 2, robe="#e8e2d0", head_wrap="#d8b36a", skin="#e0b89a", hat="sunhat")
    seated_figure(mb, (0.72, 1.6, 0.85), yaw=-math.pi / 2, robe="#c0463a", head_wrap="#2a2a2a", skin="#c99a78", hat="sunhat")
    obj = mb.to_object("felucca")
    shade(obj, 40)
    return obj


def build_motorboat():
    """The Nile water taxi: white hull with a red bottom, flat roof on posts,
    colourful bunting, life rings, outboard engine and a driver."""
    mb = MeshBuilder()
    white = C("white")
    red = H("#c8362c")

    def col(kind, t, z):
        if kind == "deck":
            return C("wood")
        if kind == "stripe":
            return H("#2d5fa8")
        return red if z < 0.3 else white

    loft_hull(mb, 11.0, 1.6, 0.9, 0.85, col, stations=26, segs=12, bow_rise=0.55, fullness=0.45, stern_full=0.25)
    length, half = 7.6, 1.3
    roof_z = 2.95
    mb.box((half * 2 + 0.25, length, 0.1), loc=(0, 0.6, roof_z), color=white, bevel=0.03)
    for sx in (-1, 1):
        mb.box((0.05, length + 0.05, 0.14), loc=(sx * (half + 0.14), 0.6, roof_z), color=C("duck_cyan"))
    for sx in (-half, half):
        for k in range(6):
            mb.capsule((sx, -3.1 + k * 1.48, 0.9), (sx, -3.1 + k * 1.48, roof_z), 0.04, 0.04, white, segs=6)
    bunting = [H(h) for h in ("#e23b3b", "#f2c230", "#2d7fd1", "#3fae5a", "#f28a2e")]
    k = 0
    for sx in (-half - 0.16, half + 0.16):
        for i in range(20):
            y0 = -3.2 + i * 0.38
            mb.poly([(sx, y0, roof_z - 0.05), (sx, y0 + 0.38, roof_z - 0.05), (sx, y0 + 0.19, roof_z - 0.36)], bunting[k % 5])
            k += 1
    # Pennants on a line along the roof.
    for i in range(9):
        y = -3.3 + i * 0.95
        mb.poly([(0, y, roof_z + 0.9), (0, y + 0.5, roof_z + 0.85), (0, y + 0.25, roof_z + 0.55)], bunting[i % 5])
    mb.capsule((0, -3.4, roof_z), (0, -3.4, roof_z + 1.0), 0.025, 0.025, white, segs=4)
    mb.capsule((0, 4.3, roof_z), (0, 4.3, roof_z + 1.0), 0.025, 0.025, white, segs=4)
    # Life rings: real tori, alternating colours.
    rings = [H(h) for h in ("#2d7fd1", "#e23b3b", "#f2c230")]
    for i in range(5):
        for sx in (-1, 1):
            torus(mb, (sx * 1.62, -2.6 + i * 1.3, 1.25), 0.24, 0.06, rings[(i + (sx > 0)) % 3], axis="X")
    for i in range(4):
        mb.box((2.3, 0.4, 0.2), loc=(0, -2.2 + i * 1.6, 0.95), color=C("duck_cyan"), bevel=0.05)
        mb.box((2.3, 0.08, 0.45), loc=(0, -2.0 + i * 1.6, 1.2), color=C("duck_cyan"), bevel=0.02)
    # Outboard engine and the driver.
    mb.box((0.45, 0.5, 0.7), loc=(0, 5.55, 1.05), color=H("#2a2a2a"), bevel=0.08)
    mb.capsule((0, 5.6, 0.7), (0, 5.62, -0.3), 0.08, 0.06, H("#3a3a3a"), segs=6)
    seated_figure(mb, (0, 4.7, 0.9), yaw=0.0, robe="#e9e6dc", head_wrap="#f4f1ea", arms_forward=0.4)
    obj = mb.to_object("motorboat")
    shade(obj, 40)
    return obj


def build_cruise():
    """A Nile cruise boat moored at the Corniche: navy hull with portholes,
    three decks of cabins with balconies, and a sun deck with loungers."""
    mb = MeshBuilder()
    white = C("white")
    L, W = 19.0, 4.4
    outline = [(-W / 2, L / 2), (W / 2, L / 2), (W / 2, -L / 2 + 3.0), (W * 0.2, -L / 2 + 0.6), (0, -L / 2), (-W * 0.2, -L / 2 + 0.6), (-W / 2, -L / 2 + 3.0)]
    mb.prism(outline, -0.6, 1.05, C("duck_navy"))
    mb.prism([(x * 1.01, y * 1.005) for x, y in outline], 1.05, 1.2, white)
    for s in (-1, 1):
        for i in range(14):
            mb.uv_sphere(0.1, loc=(s * (W / 2 + 0.005), -6.8 + i * 1.05, 0.55), color=H("#0c1a2a"), segs=8, rings=6, scale=(0.3, 1, 1))
    for level in range(3):
        z0 = 1.2 + level * 1.2
        inset = 0.2 + level * 0.12
        front = -L / 2 + 3.3 + level * 0.8
        deck = [(-W / 2 + inset, L / 2 - 0.35), (W / 2 - inset, L / 2 - 0.35), (W / 2 - inset, front), (-W / 2 + inset, front)]
        mb.prism(deck, z0, z0 + 1.1, white)
        span = (L / 2 - 0.35) - front
        for s in (-1, 1):
            x = s * (W / 2 - inset + 0.01)
            # Cabin windows and balcony rails.
            for i in range(int(span / 1.1)):
                y = front + 0.6 + i * 1.1
                mb.box((0.05, 0.75, 0.6), loc=(x, y, z0 + 0.58), color=H("#1f3346"))
            mb.box((0.04, span - 0.3, 0.05), loc=(x + s * 0.12, front + span / 2, z0 + 1.0), color=H("#c9cdd2"))
        mb.box((W - inset * 2 + 0.3, span + 0.2, 0.06), loc=(0, front + span / 2, z0 + 1.12), color=H("#e6e2da"))
    top = 1.2 + 3 * 1.2
    # Wheelhouse, funnel-mast and a flag.
    mb.box((2.6, 1.8, 1.1), loc=(0, -3.8, top + 0.55), color=white, bevel=0.08)
    mb.box((2.62, 0.05, 0.45), loc=(0, -4.7, top + 0.7), color=H("#1f3346"))
    mb.capsule((0, -3.3, top + 1.1), (0, -3.3, top + 3.2), 0.05, 0.04, white, segs=6)
    mb.poly([(0, -3.3, top + 3.1), (0, -2.5, top + 2.95), (0, -3.3, top + 2.7)], H("#c8102e"))
    # Sun deck: loungers and umbrellas.
    for i in range(4):
        y = -1.2 + i * 2.1
        for sx in (-1.1, 1.1):
            mb.box((0.55, 1.5, 0.12), loc=(sx, y, top + 0.2), color=white, bevel=0.03)
        mb.capsule((0, y, top), (0, y, top + 1.7), 0.03, 0.03, white, segs=4)
        mb.cylinder(1.2, 0.05, 0.45, loc=(0, y, top + 1.85), color=H("#e8dcc2") if i % 2 else C("duck_cyan"), segs=12)
    obj = mb.to_object("cruise")
    shade(obj, 35)
    return obj


# ---------------------------------------------------------------------------
# Vegetation


def palm_trunk(mb, path, r0, r1, rng, bark="#7a5634"):
    """Palm trunk with the criss-cross leaf-base ("boot") pattern."""
    rings = []
    steps = len(path) - 1
    segs = 9
    for i, p in enumerate(path):
        t = i / steps
        d = (path[min(i + 1, steps)] - path[max(i - 1, 0)]).normalized()
        side = d.cross(Vector((0, 0, 1)))
        if side.length < 1e-4:
            side = Vector((1, 0, 0))
        side.normalize()
        up = side.cross(d).normalized()
        row = []
        for s in range(segs):
            a = s / segs * math.tau
            bump = 0.07 * abs(math.sin(a * 3 + t * 34)) * (1 - t * 0.3)
            r = (r0 + (r1 - r0) * t) * (1 + bump) * (1.25 if t < 0.04 else 1)
            row.append(mb.bm.verts.new(p + (side * math.cos(a) + up * math.sin(a)) * r))
        rings.append(row)
    faces = []
    for i in range(steps):
        for s in range(segs):
            a, b = rings[i], rings[i + 1]
            faces.append(mb.bm.faces.new((a[s], a[(s + 1) % segs], b[(s + 1) % segs], b[s])))
    base = H(bark)
    mb.paint_vertices(faces, lambda v: mix(base, H("#4a3320"), 0.5 + 0.5 * n3(v.co, 6.0, 3.1)))
    return faces


def frond_card(cards, base, direction, length, width, droop, tint, lift=0.55, steps=7):
    """One date-palm frond: an arching rachis with leaflets on both sides in a V."""
    d = Vector((direction.x, direction.y, 0)).normalized()
    side = Vector((-d.y, d.x, 0))
    pts, lefts, rights, us = [], [], [], []
    for s in range(steps + 1):
        t = s / steps
        p = base + d * length * t + Vector((0, 0, lift * length * t - droop * length * t * t))
        w = width * math.sin(math.pi * (0.12 + 0.86 * t)) ** 0.5
        pts.append(p)
        lefts.append(p + side * w + Vector((0, 0, w * 0.35)))
        rights.append(p - side * w + Vector((0, 0, w * 0.35)))
        us.append(t)
    cards.strip(pts, lefts, us, 0.5, 1.0, tint)
    cards.strip(pts, rights, us, 0.5, 0.0, tint)


def build_palm(variant):
    """0, 1: date palms (straight and leaning). 2: doum palm, forked, with fan leaves."""
    mb = MeshBuilder()
    cards = Cards()
    rng = random.Random(100 + variant)
    white = (1.0, 1.0, 1.0, 1.0)
    if variant in (0, 1):
        height = 7.2 if variant == 0 else 8.0
        lean = Vector((rng.uniform(-1.0, 1.0), rng.uniform(-1.0, 1.0), 0)) * (0.5 if variant == 0 else 1.4)
        path = [Vector((0, 0, height * t)) + lean * (t**1.6) for t in (i / 10 for i in range(11))]
        palm_trunk(mb, path, 0.3, 0.2, rng)
        crown = path[-1]
        mb.sphere(0.34, loc=crown + Vector((0, 0, 0.1)), color=H("#6a5a30"), subdiv=2)
        # Upper green fronds, arching out; a few older ones drooping.
        for i in range(16):
            a = i / 16 * math.tau + rng.uniform(-0.15, 0.15)
            tier = i % 3
            frond_card(
                cards,
                crown + Vector((0, 0, 0.1 + tier * 0.12)),
                Vector((math.cos(a), math.sin(a), 0)),
                length=rng.uniform(3.0, 3.8),
                width=0.8,
                droop=[0.55, 0.8, 1.1][tier],
                lift=[0.75, 0.55, 0.35][tier],
                tint=mix(white, H("#c8d890"), rng.uniform(0, 0.4)),
            )
        # A skirt of dry brown fronds under the crown.
        for i in range(6):
            a = i / 6 * math.tau + rng.uniform(0, 0.5)
            frond_card(cards, crown - Vector((0, 0, 0.25)), Vector((math.cos(a), math.sin(a), 0)), 2.2, 0.55, 2.2, H("#b8905a"), lift=0.1)
        # Date clusters hanging under the crown.
        for k in range(4):
            a = k / 4 * math.tau + 0.4
            c = crown + Vector((math.cos(a) * 0.45, math.sin(a) * 0.45, -0.55))
            mb.sphere(0.2, loc=c, color=H("#d4761c"), subdiv=2, scale=(1, 1, 1.5))
        leaves_tex = "frond"
    else:
        # Doum palm: the trunk forks twice — the classic Nubian riverbank palm.
        path = [Vector((0, 0, 3.4 * t)) for t in (i / 8 for i in range(9))]
        palm_trunk(mb, path, 0.26, 0.2, rng, bark="#6e5a44")
        tips = []
        for s1 in (-1, 1):
            b1 = [path[-1] + Vector((s1 * 1.1 * t, 0.2 * t, 1.6 * t)) for t in (i / 5 for i in range(6))]
            palm_trunk(mb, b1, 0.2, 0.15, rng, bark="#6e5a44")
            for s2 in (-1, 1):
                tip = b1[-1] + Vector((s2 * 0.4 + s1 * 0.5, s2 * 0.7, 1.4))
                b2 = [b1[-1].lerp(tip, t) for t in (i / 4 for i in range(5))]
                palm_trunk(mb, b2, 0.15, 0.11, rng, bark="#6e5a44")
                tips.append(tip)
        for tip in tips:
            mb.uv_sphere(0.18, loc=tip, color=H("#5a4a30"), segs=8, rings=6)
            for i in range(9):
                a = i / 9 * math.tau
                d = Vector((math.cos(a), math.sin(a), 0))
                up = Vector((0, 0, 1))
                tilt = (d * 0.8 + up * 0.6).normalized()
                size = 1.1
                c0 = tip + tilt * 0.2
                right = d.cross(up).normalized() * size
                far = tip + tilt * (size * 2)
                cards.quad([c0 - right * 0.15, c0 + right * 0.15, far + right, far - right], [(0.5, 0.05), (0.5, 0.05), (1, 1), (0, 1)], mix(white, H("#c8d890"), rng.random() * 0.3))
        leaves_tex = "fan"
    trunk = mb.to_object(f"palm_{variant}")
    shade(trunk, 50)
    leaves = cards.to_object(f"palm_{variant}__leaves", textured_material(f"foliage_{leaves_tex}", leaves_tex))
    return [trunk, leaves]


def build_tree(variant):
    """Broadleaf trees: 0, 1 greens (Kitchener's Island, gardens), 2 flame tree in flower."""
    mb = MeshBuilder()
    cards = Cards()
    rng = random.Random(200 + variant)
    h = [2.6, 3.2, 2.4][variant]
    bark = H("#5b4636")
    mb.capsule((0, 0, -0.2), (0.1, 0.05, h), 0.24, 0.16, bark, segs=10)
    tops = []
    for i in range(4):
        a = i / 4 * math.tau + rng.uniform(-0.3, 0.3)
        end = Vector((math.cos(a) * 1.3, math.sin(a) * 1.3, h + rng.uniform(0.8, 1.6)))
        mb.capsule((0.1, 0.05, h * 0.85), end, 0.12, 0.06, bark, segs=6)
        tops.append(end)
    tint = [H("#8fb070"), H("#a8c07a"), H("#ff6a3a")][variant]
    white = (1.0, 1.0, 1.0, 1.0)
    radius = [2.1, 2.5, 2.4][variant]
    centre = Vector((0.1, 0.05, h + 1.3))
    for i in range(46):
        # Points inside a squashed ellipsoid canopy.
        p = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.6, 1)))
        if p.length > 1:
            continue
        pos = centre + Vector((p.x * radius, p.y * radius, p.z * radius * 0.7))
        size = rng.uniform(0.9, 1.4)
        a = rng.uniform(0, math.pi)
        tilt = rng.uniform(-0.6, 0.6)
        u = Vector((math.cos(a), math.sin(a), tilt)).normalized() * size
        v = Vector((-math.sin(a) * tilt, math.cos(a) * tilt, 1)).normalized() * size
        shade_k = 0.7 + 0.3 * (p.z + 0.6) / 1.6  # lower leaves a bit darker
        c = mix(tint, white, 0.0)
        c = (c[0] * shade_k, c[1] * shade_k, c[2] * shade_k, 1.0)
        cards.quad([pos - u - v, pos + u - v, pos + u + v, pos - u + v], [(0, 0), (1, 0), (1, 1), (0, 1)], c)
    trunk = mb.to_object(f"tree_{variant}")
    shade(trunk, 50)
    leaves = cards.to_object(f"tree_{variant}__leaves", textured_material("foliage_leaves", "leaves"))
    return [trunk, leaves]


def build_reeds():
    """A clump of riverbank reeds / papyrus for island shores."""
    mb = MeshBuilder()
    rng = random.Random(77)
    for i in range(22):
        a = rng.uniform(0, math.tau)
        r = rng.uniform(0, 0.7)
        base = Vector((math.cos(a) * r, math.sin(a) * r, -0.3))
        tip = base + Vector((rng.uniform(-0.4, 0.4), rng.uniform(-0.4, 0.4), rng.uniform(1.4, 2.4)))
        d = tip - base
        mb.cylinder(0.035, 0.004, d.length, loc=(base + tip) / 2, color=mix(H("#6b8a3a"), H("#a8a04a"), rng.random()), segs=3, rot=d.to_track_quat("Z", "Y").to_euler(), cap=False)
        if rng.random() < 0.3:
            # Papyrus umbel.
            mb.uv_sphere(0.16, loc=tip, color=H("#8aa04a"), segs=6, rings=3, scale=(1, 1, 0.45))
    obj = mb.to_object("reeds")
    shade(obj, 60)
    return obj


# ---------------------------------------------------------------------------
# Buildings


NUBIAN_WALLS = ["#3f8fd2", "#2fb2a8", "#e98aa0", "#f2c230", "#f3efe6", "#e0a43c"]
NUBIAN_ACCENTS = ["#f3efe6", "#f3efe6", "#f3efe6", "#3f8fd2", "#2f6fb2", "#f3efe6"]
MOTIFS = ["#e23b3b", "#1f5fa8", "#f2c230", "#2fb2a8", "#121528"]


def plaster(color, rng):
    """Hand-plastered walls: a gentle mottling so they never look like plastic."""
    base = H(color)
    return lambda v: mix(base, mix(base, H("#8a7a60"), 0.35), 0.5 + 0.5 * n3(v.co, 1.7, rng.random() * 10))


def build_house(variant):
    """Nubian house: bevelled plaster walls, painted motif band, arched door,
    shuttered windows, toothed parapet, domes/vaults, a mud bench and plants."""
    mb = MeshBuilder()
    rng = random.Random(300 + variant)
    wall_hex, accent = NUBIAN_WALLS[variant], H(NUBIAN_ACCENTS[variant])
    w, d, h = 4.4, 4.8, 3.0
    walls = mb.box((w, d, h), loc=(0, 0, h / 2), color=H(wall_hex), bevel=0.07)
    mb.paint_vertices(walls, plaster(wall_hex, rng))
    # Plinth and parapet.
    mb.box((w + 0.12, d + 0.12, 0.35), loc=(0, 0, 0.17), color=mix(H(wall_hex), H("#6b5a40"), 0.4), bevel=0.04)
    # Mud-plastered roof slab with a painted rim.
    roof_slab = mb.box((w + 0.06, d + 0.06, 0.16), loc=(0, 0, h + 0.04), color=H("#c9a57a"), bevel=0.03)
    mb.paint_vertices(roof_slab, plaster("#c9a57a", rng))
    for sy in (-1, 1):
        mb.box((w + 0.1, 0.14, 0.2), loc=(0, sy * (d / 2 + 0.01), h + 0.1), color=accent, bevel=0.02)
    for sx in (-1, 1):
        mb.box((0.14, d + 0.1, 0.2), loc=(sx * (w / 2 + 0.01), 0, h + 0.1), color=accent, bevel=0.02)
    for i in range(9):
        x = -w / 2 + 0.25 + i * (w - 0.5) / 8
        mb.box((0.28, 0.12, 0.3), loc=(x, -d / 2 + 0.03, h + 0.28), color=accent, bevel=0.04)
    # Painted motif band: a row of triangles across the facade.
    for i in range(12):
        x0 = -w / 2 + 0.2 + i * (w - 0.4) / 12
        wdt = (w - 0.4) / 12
        c = H(MOTIFS[(i + variant) % len(MOTIFS)])
        mb.poly([(x0, -d / 2 - 0.041, h * 0.78), (x0 + wdt, -d / 2 - 0.041, h * 0.78), (x0 + wdt / 2, -d / 2 - 0.041, h * 0.78 + 0.28)], c)
    mb.box((w - 0.3, 0.02, 0.06), loc=(0, -d / 2 - 0.035, h * 0.76), color=accent)
    # Arched doorway: white frame, blue double door with a round arch above.
    mb.box((1.45, 0.1, 2.25), loc=(0, -d / 2 - 0.02, 1.12), color=accent, bevel=0.03)
    arch = mb.cylinder(0.72, 0.72, 0.1, loc=(0, -d / 2 - 0.02, 2.25), color=accent, segs=16, rot=(math.pi / 2, 0, 0))
    mb.box((1.05, 0.12, 2.0), loc=(0, -d / 2 - 0.03, 1.0), color=H("#1f5fa8") if variant % 2 == 0 else H("#6b3a1f"), bevel=0.02)
    mb.cylinder(0.52, 0.52, 0.12, loc=(0, -d / 2 - 0.03, 2.0), color=H("#1f5fa8") if variant % 2 == 0 else H("#6b3a1f"), segs=14, rot=(math.pi / 2, 0, 0))
    for sx in (-0.3, 0.3):
        mb.box((0.04, 0.14, 1.7), loc=(sx, -d / 2 - 0.04, 1.0), color=H("#0f2a50"))
    # Windows with wooden shutters and a dark grille.
    for s in (-1, 1):
        mb.box((0.7, 0.08, 0.65), loc=(s * 1.45, -d / 2 - 0.02, 2.0), color=accent, bevel=0.02)
        mb.box((0.5, 0.1, 0.48), loc=(s * 1.45, -d / 2 - 0.03, 2.0), color=H("#1a1a1a"))
        for sh in (-1, 1):
            mb.box((0.26, 0.05, 0.52), loc=(s * 1.45 + sh * 0.42, -d / 2 - 0.06, 2.0), color=H("#2f8f5f") if variant % 3 else H("#1f5fa8"), rot=(0, 0, sh * 0.5))
        mb.box((0.08, 0.6, 0.5), loc=(s * (w / 2 + 0.02), 0.8, 2.0), color=H("#1a1a1a"))
    # Mud bench (mastaba) along the front, and a zeer water jar on its stand.
    mb.box((1.1, 0.55, 0.45), loc=(1.55, -d / 2 - 0.35, 0.22), color=mix(H(wall_hex), H("#b98859"), 0.5), bevel=0.08)
    jar = mb.uv_sphere(0.24, loc=(-1.6, -d / 2 - 0.45, 0.62), color=C("terracotta"), segs=12, rings=8, scale=(1, 1, 1.25))
    mb.box((0.5, 0.5, 0.35), loc=(-1.6, -d / 2 - 0.45, 0.17), color=C("wood_dark"), bevel=0.02)
    # Bougainvillea spilling over one corner.
    for k in range(9):
        p = Vector((rng.uniform(1.4, 2.3), -d / 2 - rng.uniform(0.05, 0.35), rng.uniform(1.2, h + 0.3)))
        mb.sphere(rng.uniform(0.2, 0.32), loc=p, color=H("#d6247a") if rng.random() < 0.65 else H("#3f7a33"), subdiv=2)
    roof = h + 0.14
    white = H("#f3efe6")
    if variant == 5:
        up = mb.box((w * 0.6, d * 0.55, 2.2), loc=(-w * 0.18, d * 0.18, roof + 1.1), color=H(wall_hex), bevel=0.06)
        mb.paint_vertices(up, plaster(wall_hex, rng))
        mb.dome(0.95, loc=(-w * 0.18, d * 0.18, roof + 2.2), color=white, segs=12, rings=5)
    elif variant in (0, 2, 4):
        mb.cylinder(1.3, 1.3, 0.3, loc=(0.6, 0.5, roof + 0.15), color=white, segs=14, cap=False)
        mb.dome(1.3, loc=(0.6, 0.5, roof + 0.3), color=white if variant != 4 else C("sand"), segs=14, rings=5)
        mb.dome(0.7, loc=(-1.2, -0.9, roof), color=accent, segs=10, rings=4)
    else:
        mb.vault(2.3, 3.6, loc=(0.5, 0.3, roof), color=white, segs=10)
        mb.vault(1.4, 1.8, loc=(-1.3, -1.2, roof), color=accent, segs=8, rot=(0, 0, math.pi / 2))
    obj = mb.to_object(f"house_{variant}")
    shade(obj, 38)
    return obj


def build_block(variant):
    """East-bank Egyptian city buildings. 0–3 set back and taller; 4–7 low
    Corniche fronts with shops. Framed windows, balconies, AC units, satellite
    dishes and the rebar of an 'unfinished' top floor."""
    mb = MeshBuilder()
    rng = random.Random(400 + variant)
    tall = variant < 4
    floors = [6, 5, 7, 5][variant % 4] if tall else [2, 3, 2, 3][variant % 4]
    wall_hex = ["#e8dcc0", "#d6b98e", "#f2efe8", "#dca08a"][variant % 4]
    w, d = (7.0, 7.0) if tall else (8.0, 5.5)
    fh = 1.7
    h = floors * fh
    walls = mb.box((w, d, h), loc=(0, 0, h / 2), color=H(wall_hex), bevel=0.05)
    mb.paint_vertices(walls, plaster(wall_hex, rng))
    cols = 4 if tall else 5
    for f in range(floors):
        z = f * fh + fh * 0.55
        # The back faces away from the river and is rarely seen: skip its windows.
        for side in ("front", "left", "right"):
            for c in range(cols):
                off = -((cols - 1) / 2) + c
                if side in ("front", "back"):
                    s = -1 if side == "front" else 1
                    x, y = off * (w / cols), s * (d / 2 + 0.02)
                    size, rot = (0.95, 0.08, 1.0), (0, 0, 0)
                else:
                    s = -1 if side == "left" else 1
                    x, y = s * (w / 2 + 0.02), off * (d / cols)
                    size, rot = (0.08, 0.95, 1.0), (0, 0, 0)
                if not tall and f == 0 and side == "front":
                    continue
                mb.box(size, loc=(x, y, z), color=H("#253444") if rng.random() > 0.25 else H("#6b4a2a"))
                if side == "front" and f > 0 and rng.random() < 0.45:
                    # Balcony with a railing.
                    mb.box((1.3, 0.7, 0.08), loc=(x, y - 0.35, z - 0.55), color=H(wall_hex), bevel=0.02)
                    mb.box((1.3, 0.04, 0.5), loc=(x, y - 0.7, z - 0.28), color=H("#3a3a3a"))
                if rng.random() < 0.18:
                    mb.box((0.5, 0.35, 0.35), loc=(x + 0.55, y + (0.2 if side == "back" else -0.2), z - 0.1), color=H("#d7d9dc"), bevel=0.03)
        if not tall and f == 0:
            # Ground-floor shops: shutters and a coloured awning.
            for c in range(3):
                mb.box((2.0, 0.08, 1.4), loc=(-2.6 + c * 2.6, -d / 2 - 0.02, 0.8), color=H("#7a7f86"))
            mb.box((w * 0.95, 1.0, 0.07), loc=(0, -d / 2 - 0.5, fh * 0.95), color=H(["#067ba1", "#c8362c", "#3fae5a", "#f2c230"][variant % 4]), rot=(-0.18, 0, 0))
    mb.box((w + 0.1, d + 0.1, 0.25), loc=(0, 0, h + 0.1), color=mix(H(wall_hex), H("#ffffff"), 0.3), bevel=0.03)
    # Rooftop: water tanks, satellite dishes, stair head, and rebar columns.
    for _ in range(2 if tall else 1):
        mb.cylinder(0.45, 0.45, 0.9, loc=(rng.uniform(-w / 3, w / 3), rng.uniform(-d / 3, d / 3), h + 0.7), color=H("#f4f1ea"), segs=12)
    for _ in range(rng.randint(1, 3)):
        p = Vector((rng.uniform(-w / 2.5, w / 2.5), rng.uniform(-d / 2.5, d / 2.5), h + 0.6))
        mb.dome(0.35, loc=p, color=H("#e6e6e6"), segs=10, rings=3, height=0.12)
    mb.box((1.8, 1.8, 1.4), loc=(w / 4, d / 4, h + 0.8), color=H(wall_hex), bevel=0.04)
    if rng.random() < 0.6:
        for cx in (-1, 1):
            for cy in (-1, 1):
                base = Vector((cx * (w / 2 - 0.3), cy * (d / 2 - 0.3), h + 0.2))
                mb.box((0.35, 0.35, 0.6), loc=base + Vector((0, 0, 0.3)), color=H("#b8b0a0"))
                for k in range(3):
                    mb.capsule(base + Vector((k * 0.08 - 0.08, 0, 0.6)), base + Vector((k * 0.08 - 0.08 + rng.uniform(-0.1, 0.1), 0, 1.4)), 0.012, 0.012, H("#5a3a2a"), segs=3)
    obj = mb.to_object(f"block_{variant}")
    shade(obj, 35)
    return obj


def build_tower():
    """The Mövenpick tower at the north of Elephantine — Aswan's skyline marker."""
    mb = MeshBuilder()
    cream = C("cream")
    mb.box((7, 7, 3), loc=(0, 0, 1.5), color=cream, bevel=0.1)
    mb.cylinder(2.3, 2.1, 22, loc=(0, 0, 14), color=cream, segs=16)
    for i in range(10):
        mb.cylinder(2.33, 2.33, 0.35, loc=(0, 0, 5 + i * 1.9), color=H("#2b3a4a"), segs=16, cap=False)
    mb.cylinder(4.0, 3.6, 3.2, loc=(0, 0, 26.2), color=cream, segs=20)
    mb.cylinder(4.05, 4.05, 1.2, loc=(0, 0, 26.4), color=H("#2b3a4a"), segs=20, cap=False)
    mb.cylinder(2.6, 1.6, 1.4, loc=(0, 0, 28.5), color=C("white"), segs=16)
    mb.capsule((0, 0, 29), (0, 0, 32), 0.1, 0.06, H("#c8362c"), segs=6)
    obj = mb.to_object("tower")
    shade(obj, 35)
    return obj


# ---------------------------------------------------------------------------
# Granite, camels and Corniche furniture


def build_rock(variant):
    """Aswan granite boulder: rounded, water-polished, dark desert varnish over
    pink-grey granite, speckled, darker and wet at the waterline."""
    mb = MeshBuilder()
    rng = random.Random(500 + variant)
    seed = variant * 7.3
    shapes = [(1.35, 1.0, 0.8), (1.0, 1.0, 0.95), (1.7, 1.15, 0.6), (1.1, 0.9, 1.2), (1.5, 1.3, 0.7), (1.2, 0.8, 0.9)]
    sx, sy, sz = shapes[variant]
    faces = mb.sphere(1.0, loc=(0, 0, 0), color=C("granite"), subdiv=4)
    for v in {v for f in faces for v in f.verts}:
        p = v.co.normalized()
        # Big rounded lumps plus a few cracks/facets; flattened underside.
        r = 1 + 0.22 * n3(p, 1.4, seed) + 0.07 * n3(p, 3.5, seed + 1) + 0.02 * n3(p, 9, seed + 2)
        q = Vector((p.x * sx, p.y * sy, p.z * sz)) * r
        if q.z < -0.1:
            q.z = -0.1 + (q.z + 0.1) * 0.35
        v.co = q + Vector((0, 0, 0.25))
    if variant == 4:
        # A second boulder fused on — the cataract's typical piles.
        extra = mb.sphere(0.7, loc=(1.2, 0.5, 0.2), color=C("granite"), subdiv=3)
        for v in {v for f in extra for v in f.verts}:
            p = (v.co - Vector((1.2, 0.5, 0.2))).normalized()
            v.co = Vector((1.2, 0.5, 0.2)) + Vector((p.x * 0.8, p.y * 0.7, p.z * 0.6)) * (1 + 0.2 * n3(p, 1.6, seed + 5))
        faces = set(faces) | set(extra)
    bmesh.ops.recalc_face_normals(mb.bm, faces=list(mb.bm.faces))
    varnish = H("#3b302c")
    granite = H("#9a8176")
    wet = H("#1f1a18")

    def color(v):
        p = v.co
        patch = n3(p, 1.1, seed + 3)
        c = mix(varnish, granite, max(0.0, min(1.0, (patch + 0.15) * 1.6)))
        speck = n3(p, 14.0, seed + 4)
        c = mix(c, H("#141111") if speck > 0.35 else H("#d8c8bc"), 0.35 if abs(speck) > 0.35 else 0.0)
        if p.z < 0.45:
            c = mix(c, wet, min(1.0, (0.45 - p.z) * 1.8))
        return c

    mb.paint_vertices(faces, color)
    obj = mb.to_object(f"rock_{variant}")
    mod = obj.modifiers.new("decimate", "DECIMATE")
    mod.ratio = 0.3
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    shade(obj, 70)
    return obj


def build_camel():
    """A dromedary resting on the sand, legs folded, with a woven saddle blanket."""
    mb = MeshBuilder()
    tan = H("#c89a63")
    body = mb.uv_sphere(1.0, loc=(0, 0.15, 0.62), color=tan, segs=20, rings=14, scale=(0.62, 1.15, 0.52))
    mb.uv_sphere(0.5, loc=(0, 0.3, 1.02), color=tan, segs=16, rings=10, scale=(0.9, 1.2, 0.85))
    # Neck curves forward then up; small head with a long muzzle.
    neck = [Vector((0, -0.8, 0.8)), Vector((0, -1.2, 1.05)), Vector((0, -1.35, 1.55)), Vector((0, -1.45, 1.85))]
    for a, b in zip(neck, neck[1:]):
        mb.capsule(a, b, 0.2, 0.15, tan, segs=10)
    mb.uv_sphere(0.2, loc=(0, -1.6, 1.95), color=tan, segs=14, rings=10, scale=(0.8, 1.2, 0.85))
    mb.capsule((0, -1.7, 1.93), (0, -1.95, 1.85), 0.1, 0.075, mix(tan, H("#7a5a3a"), 0.3), segs=8)
    for s in (-1, 1):
        mb.uv_sphere(0.035, loc=(s * 0.13, -1.72, 2.02), color=H("#111111"), segs=6, rings=4)
        mb.uv_sphere(0.05, loc=(s * 0.1, -1.52, 2.12), color=tan, segs=6, rings=4, scale=(0.6, 0.6, 1.3))
        # Folded legs tucked beneath.
        mb.capsule((s * 0.45, -0.55, 0.18), (s * 0.5, 0.05, 0.12), 0.11, 0.09, mix(tan, H("#8a6a45"), 0.25), segs=8)
        mb.capsule((s * 0.45, 0.55, 0.2), (s * 0.55, 1.05, 0.12), 0.12, 0.09, mix(tan, H("#8a6a45"), 0.25), segs=8)
    mb.capsule((0, 1.3, 0.75), (0, 1.45, 0.35), 0.04, 0.03, mix(tan, H("#4a3a2a"), 0.4), segs=5)
    # Woven blanket with stripes over the hump.
    for i, c in enumerate(("#c8362c", "#f2c230", "#1f5fa8", "#c8362c")):
        mb.box((1.3, 0.22, 0.08), loc=(0, 0.0 + i * 0.22, 1.36 - abs(i - 1.5) * 0.04), color=H(c), bevel=0.02)
    obj = mb.to_object("camel")
    shade(obj, 50)
    return obj


def build_lamp():
    """Corniche street lamp: cast-iron post with a lantern."""
    mb = MeshBuilder()
    iron = H("#1d2a2a")
    mb.cylinder(0.14, 0.1, 0.4, loc=(0, 0, 0.2), color=iron, segs=10)
    mb.capsule((0, 0, 0.3), (0, 0, 3.6), 0.06, 0.045, iron, segs=8)
    mb.capsule((0, 0, 3.6), (0, -0.55, 3.75), 0.03, 0.03, iron, segs=6)
    mb.cylinder(0.12, 0.18, 0.35, loc=(0, -0.6, 3.55), color=H("#f7e7b0"), segs=8)
    mb.cylinder(0.2, 0.05, 0.12, loc=(0, -0.6, 3.78), color=iron, segs=8)
    obj = mb.to_object("lamp")
    shade(obj, 40)
    return obj


def build_railing():
    """3 m of Corniche railing: stone posts and a painted rail."""
    mb = MeshBuilder()
    stone = H("#d8ccb4")
    for x in (-1.5, 0.0, 1.5):
        mb.box((0.22, 0.22, 0.9), loc=(x, 0, 0.45), color=stone, bevel=0.03)
    mb.box((3.1, 0.12, 0.08), loc=(0, 0, 0.85), color=H("#e8e2d0"), bevel=0.02)
    mb.box((3.0, 0.05, 0.05), loc=(0, 0, 0.45), color=H("#2d5f8f"))
    obj = mb.to_object("railing")
    shade(obj, 40)
    return obj


def build_bench():
    mb = MeshBuilder()
    mb.box((1.7, 0.45, 0.07), loc=(0, 0, 0.45), color=H("#7a5634"), bevel=0.02)
    mb.box((1.7, 0.06, 0.4), loc=(0, 0.22, 0.72), color=H("#7a5634"), bevel=0.02, rot=(0.2, 0, 0))
    for x in (-0.7, 0.7):
        mb.box((0.08, 0.45, 0.45), loc=(x, 0, 0.22), color=H("#2a2a2a"))
    obj = mb.to_object("bench")
    shade(obj, 40)
    return obj


# ---------------------------------------------------------------------------
# Tripo clean-up


def tripo_replace(name, fallback, target_faces):
    """If a Tripo draft exists for `name`, clean it up and swap it in for `fallback`."""
    path = os.path.join(TRIPO_DIR, f"{name}.glb")
    if not os.path.exists(path):
        return fallback

    import numpy as np

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    imported = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    for o in bpy.data.objects:
        if o not in before and o.type != "MESH":
            bpy.data.objects.remove(o)
    if not imported:
        print(f"tripo {name}: no meshes, keeping fallback")
        return fallback

    bpy.ops.object.select_all(action="DESELECT")
    for o in imported:
        o.select_set(True)
    bpy.context.view_layer.objects.active = imported[0]
    if len(imported) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    faces = len(obj.data.polygons)
    if faces > target_faces:
        mod = obj.modifiers.new("decimate", "DECIMATE")
        mod.ratio = target_faces / faces
        bpy.ops.object.modifier_apply(modifier=mod.name)

    # Flatten the texture into per-face colours sampled at each face's UV centroid.
    me = obj.data
    image = None
    for mat in me.materials:
        if mat and mat.node_tree:
            for node in mat.node_tree.nodes:
                if node.type == "TEX_IMAGE" and node.image:
                    image = node.image
                    break
        if image:
            break
    colors = []
    if image and me.uv_layers:
        w, h = image.size
        px = np.array(image.pixels[:], dtype=np.float32).reshape(h, w, image.channels)
        uv = me.uv_layers.active.data
        for poly in me.polygons:
            u = sum(uv[i].uv[0] for i in poly.loop_indices) / poly.loop_total
            v = sum(uv[i].uv[1] for i in poly.loop_indices) / poly.loop_total
            x = min(w - 1, max(0, int((u % 1.0) * w)))
            y = min(h - 1, max(0, int((v % 1.0) * h)))
            srgb = px[y, x, :3]
            lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb]
            colors.append((*lin, 1.0))
    else:
        colors = [C("white")] * len(me.polygons)

    for attr in list(me.color_attributes):
        me.color_attributes.remove(attr)
    col = me.color_attributes.new("Color", "FLOAT_COLOR", "CORNER")
    flat = []
    for poly in me.polygons:
        flat.extend(colors[poly.index] * poly.loop_total)
    col.data.foreach_set("color", flat)
    me.color_attributes.active_color = col
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    me.materials.clear()
    me.materials.append(vertex_color_material())

    def extent(o):
        pts = [o.matrix_world @ v.co for v in o.data.vertices]
        lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        return lo, hi

    flo, fhi = extent(fallback)
    lo, hi = extent(obj)
    target = max(fhi.x - flo.x, fhi.y - flo.y)
    size = max(hi.x - lo.x, hi.y - lo.y) or 1
    s = target / size
    for v in me.vertices:
        v.co = Vector(((v.co.x - (lo.x + hi.x) / 2) * s, (v.co.y - (lo.y + hi.y) / 2) * s, (v.co.z - lo.z) * s + flo.z))

    bpy.data.objects.remove(fallback)
    obj.name = name
    me.name = name
    shade(obj, 45)
    print(f"tripo {name}: {faces} → {len(me.polygons)} faces")
    return obj


# ---------------------------------------------------------------------------


def main():
    reset_scene()
    objs = [
        tripo_replace("duckling", build_duckling(), 1400),
        build_nest(),
        tripo_replace("felucca", build_felucca(), 4000),
        build_motorboat(),
        tripo_replace("cruiseBoat", build_cruise(), 4000),
        *[o for v in range(3) for o in build_palm(v)],
        *[o for v in range(3) for o in build_tree(v)],
        build_reeds(),
        *[build_house(v) for v in range(6)],
        *[build_block(v) for v in range(8)],
        build_tower(),
        *[build_rock(v) for v in range(6)],
        tripo_replace("camel", build_camel(), 2000),
        build_lamp(),
        build_railing(),
        build_bench(),
    ]
    # Spread the props apart for the AO bake (they'd occlude each other at the
    # origin), then move them back so each exports in its own model space.
    for i, o in enumerate(objs):
        o.location = ((i % 8) * 40.0, (i // 8) * 40.0, 0.0)
    # Foliage cards pair with their trunk: keep them together for the bake.
    by_name = {o.name: o for o in objs}
    for o in objs:
        if o.name.endswith("__leaves"):
            o.location = by_name[o.name.split("__")[0]].location
    bpy.context.view_layer.update()
    bake_ao([o for o in objs if not o.name.endswith("__leaves")], distance=1.6, strength=0.75, samples=16)
    for o in objs:
        o.location = (0.0, 0.0, 0.0)

    # Distance LODs ("<name>~lod"): decimated after the bake so they keep the
    # baked shading. The game swaps them in for chunks away from the camera.
    lod_ratio = {"house_": 0.2, "block_": 0.2, "palm_": 0.35, "tree_": 0.35}
    for o in list(objs):
        ratio = next((r for prefix, r in lod_ratio.items() if o.name.startswith(prefix) and "__" not in o.name), None)
        if ratio is None:
            continue
        lod = o.copy()
        lod.data = o.data.copy()
        lod.name = f"{o.name}~lod"
        lod.data.name = lod.name
        bpy.context.scene.collection.objects.link(lod)
        mod = lod.modifiers.new("decimate", "DECIMATE")
        mod.ratio = ratio
        bpy.context.view_layer.objects.active = lod
        bpy.ops.object.modifier_apply(modifier=mod.name)
        shade(lod, 40)
        objs.append(lod)

    for o in objs:
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        print(f"{o.name:16s} {tris:6d} tris")
    print("total faces", face_count(objs))
    export_glb(os.path.join(BUILD_DIR, "props.glb"), objs)
    for i, o in enumerate(objs):
        o.location = ((i % 8) * 16.0, (i // 8) * 16.0, 0.0)
    by_name = {o.name: o for o in objs}
    for o in objs:
        if o.name.endswith("__leaves"):
            o.location = by_name[o.name.split("__")[0]].location
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BUILD_DIR, "props.blend"))


main()
