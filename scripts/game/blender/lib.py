"""Shared helpers for the game's Blender build scripts.

Everything is built from code so the look is reproducible and tweakable:
low-poly geometry, one flat colour per face (or per vertex for terrain),
exported as GLB with a COLOR_0 attribute and no textures. The browser renders
it all with a single vertex-colour material, so the whole world costs a
handful of draw calls.

Axes: Blender is Z-up; glTF/three.js is Y-up. The exporter maps Blender
(X, Y, Z) → three (X, Z, -Y). Models are authored facing Blender -Y, which is
+Z in three.js — the game's "forward" for a yaw of 0.
"""

import bmesh
import bpy
import math
import os
import random
from mathutils import Matrix, Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
GAME_SCRIPTS = os.path.join(ROOT, "scripts", "game")
BUILD_DIR = os.path.join(GAME_SCRIPTS, ".build")


# --------------------------------------------------------------------------
# Colour


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_color(h, jitter=0.0, rng=None):
    """'#rrggbb' → linear RGBA tuple, with optional brightness jitter."""
    h = h.lstrip("#")
    rgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    if jitter:
        r = (rng or random).uniform(-jitter, jitter)
        rgb = [min(1.0, max(0.0, v * (1 + r))) for v in rgb]
    return tuple(srgb_to_linear(v) for v in rgb) + (1.0,)


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(4))


# The brand + Aswan palette. Hex values are sRGB.
PAL = {
    "duck_yellow": "#f5e847",
    "duck_orange": "#f29a2e",
    "duck_navy": "#121528",
    "duck_cyan": "#067ba1",
    "white": "#f4f1ea",
    "cream": "#efe3c8",
    "sand": "#e3c38f",
    "sandstone": "#d6a878",
    "pink_sandstone": "#dca08a",
    "terracotta": "#c4674a",
    "ochre": "#e0a43c",
    "mud": "#b98859",
    "granite": "#4a3f3d",
    "granite_light": "#6b5a55",
    "granite_warm": "#7a5a4a",
    "palm_trunk": "#7a5634",
    "palm_leaf": "#3f7a36",
    "palm_leaf_light": "#6a9a3a",
    "tree_green": "#3c6e2f",
    "tree_green_light": "#5d8f3a",
    "wood": "#8a5a36",
    "wood_dark": "#5b3a22",
    "sail": "#f7f2e6",
    "black": "#1a1a1a",
    "skin": "#b57a55",
    "window": "#2b3a4a",
    "nubian_blue": "#3f8fd2",
    "nubian_turquoise": "#2fb2a8",
    "nubian_pink": "#e98aa0",
    "nubian_yellow": "#f2c230",
    "nubian_green": "#6cbf6a",
    "nubian_white": "#f3efe6",
    "camel": "#c89a63",
    "red": "#c83a32",
    "blue_stripe": "#2d5fa8",
}


def C(name, jitter=0.0, rng=None):
    return hex_color(PAL[name], jitter, rng)


# --------------------------------------------------------------------------
# Scene


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def vertex_color_material():
    mat = bpy.data.materials.get("VertexColor")
    if mat:
        return mat
    mat = bpy.data.materials.new("VertexColor")
    nt = mat.node_tree
    if nt is None:
        mat.use_nodes = True
        nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Color"
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 1.0
    return mat


# --------------------------------------------------------------------------
# Mesh building


class MeshBuilder:
    """Accumulates primitives into one bmesh, each with a flat face colour."""

    def __init__(self):
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.float_color.new("Color")

    # -- low level ----------------------------------------------------------

    def _paint(self, faces, color):
        for f in faces:
            for loop in f.loops:
                loop[self.col] = color

    def _new_faces(self, verts):
        faces = set()
        for v in verts:
            faces.update(v.link_faces)
        return faces

    def _faces_of(self, result):
        return self._new_faces(result["verts"])

    # -- primitives ---------------------------------------------------------

    def box(self, size, loc=(0, 0, 0), color=None, rot=(0, 0, 0), bevel=0.0):
        m = Matrix.LocRotScale(Vector(loc), euler(rot), Vector(size))
        res = bmesh.ops.create_cube(self.bm, size=1.0, matrix=m)
        faces = self._faces_of(res)
        # Paint first: bevel copies loop colours onto the faces it creates.
        self._paint(faces, color)
        if bevel > 0:
            # Rounded edges catch the light like real plaster, wood and stone.
            edges = list({e for f in faces for e in f.edges})
            out = bmesh.ops.bevel(self.bm, geom=edges, offset=min(bevel, min(size) * 0.45), segments=1, affect="EDGES", profile=0.5)
            # Bevel rebuilds the original faces; gather everything via its vertices.
            faces = {f for v in out["verts"] for f in v.link_faces} | {f for f in faces if f.is_valid}
            self._paint(faces, color)
        return faces

    def cylinder(self, r1, r2, depth, loc=(0, 0, 0), color=None, segs=8, rot=(0, 0, 0), cap=True):
        m = Matrix.LocRotScale(Vector(loc), euler(rot), Vector((1, 1, 1)))
        res = bmesh.ops.create_cone(
            self.bm, cap_ends=cap, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=depth, matrix=m
        )
        faces = self._faces_of(res)
        self._paint(faces, color)
        return faces

    def sphere(self, radius, loc=(0, 0, 0), color=None, subdiv=1, scale=(1, 1, 1), rot=(0, 0, 0)):
        m = Matrix.LocRotScale(Vector(loc), euler(rot), Vector(scale))
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=subdiv, radius=radius, matrix=m)
        faces = self._faces_of(res)
        self._paint(faces, color)
        return faces

    def uv_sphere(self, radius, loc=(0, 0, 0), color=None, segs=10, rings=6, scale=(1, 1, 1), rot=(0, 0, 0)):
        m = Matrix.LocRotScale(Vector(loc), euler(rot), Vector(scale))
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=segs, v_segments=rings, radius=radius, matrix=m)
        faces = self._faces_of(res)
        self._paint(faces, color)
        return faces

    def dome(self, radius, loc=(0, 0, 0), color=None, segs=10, rings=4, height=None):
        """Half sphere sitting on loc (open at the bottom)."""
        verts = []
        h = radius if height is None else height
        rows = []
        for r in range(rings + 1):
            a = (r / rings) * (math.pi / 2)
            ring_r = math.cos(a) * radius
            z = math.sin(a) * h
            if r == rings:
                rows.append([self.bm.verts.new((loc[0], loc[1], loc[2] + z))])
                verts.extend(rows[-1])
                break
            row = []
            for s in range(segs):
                t = (s / segs) * math.tau
                row.append(self.bm.verts.new((loc[0] + math.cos(t) * ring_r, loc[1] + math.sin(t) * ring_r, loc[2] + z)))
            rows.append(row)
            verts.extend(row)
        faces = []
        for r in range(rings):
            a, b = rows[r], rows[r + 1]
            for s in range(segs):
                if len(b) == 1:
                    faces.append(self.bm.faces.new((a[s], a[(s + 1) % segs], b[0])))
                else:
                    faces.append(self.bm.faces.new((a[s], a[(s + 1) % segs], b[(s + 1) % segs], b[s])))
        self._paint(faces, color)
        return faces

    def vault(self, width, length, loc=(0, 0, 0), color=None, segs=6, rot=(0, 0, 0)):
        """Nubian barrel vault: half cylinder along local Y, sitting on loc."""
        m = Matrix.LocRotScale(Vector(loc), euler(rot), Vector((1, 1, 1)))
        r = width / 2
        rows = []
        for yy in (-length / 2, length / 2):
            row = []
            for s in range(segs + 1):
                a = math.pi * s / segs
                row.append(self.bm.verts.new(m @ Vector((math.cos(a) * r, yy, math.sin(a) * r))))
            rows.append(row)
        faces = []
        for s in range(segs):
            faces.append(self.bm.faces.new((rows[0][s], rows[0][s + 1], rows[1][s + 1], rows[1][s])))
        faces.append(self.bm.faces.new(list(reversed(rows[0]))))
        faces.append(self.bm.faces.new(rows[1]))
        self._paint(faces, color)
        return faces

    def poly(self, points, color):
        """A single face from a list of 3D points."""
        verts = [self.bm.verts.new(p) for p in points]
        f = self.bm.faces.new(verts)
        self._paint([f], color)
        return [f]

    def prism(self, outline, z0, z1, color, top_color=None):
        """Extrude a 2D outline (list of (x, y)) from z0 to z1."""
        bottom = [self.bm.verts.new((x, y, z0)) for x, y in outline]
        top = [self.bm.verts.new((x, y, z1)) for x, y in outline]
        n = len(outline)
        faces = [self.bm.faces.new(list(reversed(bottom)))]
        top_face = self.bm.faces.new(top)
        for i in range(n):
            faces.append(self.bm.faces.new((bottom[i], bottom[(i + 1) % n], top[(i + 1) % n], top[i])))
        self._paint(faces, color)
        self._paint([top_face], top_color or color)
        return faces + [top_face]

    def capsule(self, a, b, r1, r2, color=None, segs=10):
        """Tapered tube from a to b with rounded ends (limbs, masts, reeds)."""
        a, b = Vector(a), Vector(b)
        d = b - a
        faces = set(self.cylinder(r1, r2, d.length, loc=(a + b) / 2, color=color, segs=segs, rot=d.to_track_quat("Z", "Y").to_euler(), cap=False))
        faces |= set(self.uv_sphere(r1, loc=a, color=color, segs=segs, rings=max(4, segs // 2)))
        faces |= set(self.uv_sphere(r2, loc=b, color=color, segs=segs, rings=max(4, segs // 2)))
        return faces

    def paint_vertices(self, faces, fn):
        """Colour by vertex (fn(vert) → rgba) so colour varies smoothly across faces."""
        cache = {}
        for f in faces:
            for loop in f.loops:
                v = loop.vert
                if v not in cache:
                    cache[v] = fn(v)
                loop[self.col] = cache[v]

    def jitter(self, faces, amount, rng):
        verts = set()
        for f in faces:
            verts.update(f.verts)
        for v in verts:
            v.co += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * amount

    def recolor(self, faces, fn):
        """Per-face colour from fn(face) (e.g. for shading variation)."""
        for f in faces:
            c = fn(f)
            for loop in f.loops:
                loop[self.col] = c

    # -- output -------------------------------------------------------------

    def to_object(self, name, collection=None):
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
        me = bpy.data.meshes.new(name)
        self.bm.to_mesh(me)
        self.bm.free()
        me.color_attributes.active_color = me.color_attributes["Color"]
        me.color_attributes.render_color_index = me.color_attributes.active_color_index
        me.materials.append(vertex_color_material())
        obj = bpy.data.objects.new(name, me)
        (collection or bpy.context.scene.collection).objects.link(obj)
        return obj


def euler(rot):
    from mathutils import Euler

    return Euler(rot, "XYZ")


# --------------------------------------------------------------------------
# Export


def export_glb(path, objects):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_normals=True,
        export_texcoords=True,
        export_materials="EXPORT",
        export_vertex_color="ACTIVE",
        export_all_vertex_colors=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
    )
    print(f"exported {path} ({os.path.getsize(path) // 1024} KB)")


# --------------------------------------------------------------------------
# Finishing: normals and baked ambient occlusion


def shade(obj, sharp_angle=35.0):
    """Smooth shading with hard edges kept above sharp_angle (boxes stay crisp, curves go smooth)."""
    me = obj.data
    for p in me.polygons:
        p.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(sharp_angle))


def bake_ao(objects, distance=1.5, strength=0.7, samples=24):
    """Bake Cycles ambient occlusion into each object's Color attribute.

    AO darkens creases, doorways, the undersides of domes and fronds: the
    single biggest step from flat colours to a believable look for
    vertex-coloured assets, at zero runtime cost. Objects must not overlap
    each other while baking, so callers spread them out first.
    """
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    if scene.world is None:
        scene.world = bpy.data.worlds.new("bake_world")
    scene.world.light_settings.distance = distance
    for obj in objects:
        me = obj.data
        color = me.color_attributes.get("Color")
        if color is None:
            continue
        ao = me.color_attributes.new("AO", "FLOAT_COLOR", color.domain)
        me.color_attributes.active_color = ao
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        n = len(color.data)
        src = [0.0] * (n * 4)
        occ = [0.0] * (n * 4)
        color.data.foreach_get("color", src)
        ao.data.foreach_get("color", occ)
        for i in range(n):
            k = 1.0 - strength * (1.0 - occ[i * 4])
            src[i * 4] *= k
            src[i * 4 + 1] *= k
            src[i * 4 + 2] *= k
        color.data.foreach_set("color", src)
        me.color_attributes.remove(ao)
        me.color_attributes.active_color = me.color_attributes["Color"]
        me.color_attributes.render_color_index = me.color_attributes.active_color_index


def face_count(objects):
    return sum(len(o.data.polygons) for o in objects)
