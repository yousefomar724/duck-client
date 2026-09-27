"""Builds scripts/game/.build/player.glb — the kayak and a rigged, animated kayaker.

    blender -b --factory-startup -P scripts/game/blender/build_player.py

Modelled on Duck's own photo of a guide paddling at sunset (public/kayak.webp):
white cap, dark ponytail, navy long-sleeve top, teal life vest, spray skirt,
orange paddle blades — in a brand-yellow touring kayak.

Rig: an armature with rigidly skinned parts (one skinned mesh, one draw per
material). Arms are driven by IK to grips on the paddle, then baked, so the
hands really follow the shaft. Two actions are exported:
  Paddle  1.0 s — left stroke (0–0.5 s) then right stroke (0.5–1.0 s)
  Idle    2.0 s — paddle resting across the deck, breathing
The game scrubs Paddle by the sim's stroke phase, so the animation always
matches the physics.

Axes: Blender Z-up, the paddler faces -Y (three.js +Z). Their left is +X.
"""

import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector

sys.path.insert(0, os.path.dirname(__file__))
from lib import BUILD_DIR, reset_scene, srgb_to_linear  # noqa: E402

FPS = 30
PADDLE_FRAMES = 30  # 1.0 s
IDLE_FRAMES = 60  # 2.0 s


# ---------------------------------------------------------------------------
# Materials (real PBR, exported as glTF metallic-roughness)


def mat(name, hex_, rough=0.6, metal=0.0, sheen=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    h = hex_.lstrip("#")
    rgb = [srgb_to_linear(int(h[i : i + 2], 16) / 255) for i in (0, 2, 4)]
    m.diffuse_color = (*rgb, 1)
    nt = m.node_tree
    if nt is None:
        m.use_nodes = True
        nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return m


M = {}


def materials():
    M.update(
        skin=mat("skin", "#b27552", 0.55),
        shirt=mat("shirt", "#1b2440", 0.85),
        vest=mat("vest", "#1f7f8f", 0.6),
        vest_dark=mat("vest_dark", "#15333d", 0.7),
        strap=mat("strap", "#161616", 0.75),
        buckle=mat("buckle", "#9aa0a6", 0.4, 0.6),
        cap=mat("cap", "#f1f1ee", 0.8),
        hair=mat("hair", "#241812", 0.5),
        glasses=mat("glasses", "#0c0c0c", 0.08, 0.3),
        shaft=mat("shaft", "#1c1c1c", 0.3, 0.2),
        blade=mat("blade", "#f07a1c", 0.35),
        blade_tip=mat("blade_tip", "#f5c518", 0.35),
        hull=mat("hull", "#f5e032", 0.28),
        hull_under=mat("hull_under", "#e9b818", 0.35),
        trim=mat("trim", "#121528", 0.4),
        rubber=mat("rubber", "#111111", 0.7),
        neoprene=mat("neoprene", "#16181c", 0.8),
        seat=mat("seat", "#5d6168", 0.8),
        metal=mat("metal", "#c8cbd0", 0.3, 0.9),
        logo=mat("logo", "#121528", 0.5),
    )


# ---------------------------------------------------------------------------
# Mesh helpers — every part becomes its own object, tagged with the bone it
# follows; they're joined into one rigidly skinned mesh at the end.


def smooth_obj(obj, subdiv=1, auto_smooth=True):
    if subdiv:
        m = obj.modifiers.new("subd", "SUBSURF")
        m.levels = subdiv
        m.render_levels = subdiv
    bpy.context.view_layer.objects.active = obj
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def new_obj(name, bm, material, bone=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(material)
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    if bone:
        obj["bone"] = bone
    return obj


def capsule(name, a, b, r1, r2, material, bone, segs=12, rings=6):
    """Tapered capsule from point a to b."""
    a, b = Vector(a), Vector(b)
    bm = bmesh.new()
    d = b - a
    length = d.length
    rot = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    # Build along +Z then orient.
    verts_rows = []
    total_rings = rings * 2 + 2
    for i in range(total_rings + 1):
        t = i / total_rings
        if t <= 0.25:
            ang = (t / 0.25) * (math.pi / 2)
            z = -math.cos(ang) * r1
            rad = math.sin(ang) * r1
        elif t >= 0.75:
            ang = ((t - 0.75) / 0.25) * (math.pi / 2)
            z = length + math.sin(ang) * r2
            rad = math.cos(ang) * r2
        else:
            u = (t - 0.25) / 0.5
            z = u * length
            rad = r1 + (r2 - r1) * u
        row = []
        for s in range(segs):
            th = s / segs * math.tau
            p = Vector((math.cos(th) * rad, math.sin(th) * rad, z))
            row.append(bm.verts.new(a + (rot @ p)))
        verts_rows.append(row)
    for i in range(len(verts_rows) - 1):
        r0, r1_ = verts_rows[i], verts_rows[i + 1]
        for s in range(segs):
            bm.faces.new((r0[s], r0[(s + 1) % segs], r1_[(s + 1) % segs], r1_[s]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    obj = new_obj(name, bm, material, bone)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def ellipsoid(name, center, radii, material, bone, segs=16, rings=10, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    m = Matrix.Diagonal((*radii, 1))
    if rot is not None:
        m = rot.to_4x4() @ m
    bmesh.ops.transform(bm, matrix=Matrix.Translation(center) @ m, verts=bm.verts[:])
    obj = new_obj(name, bm, material, bone)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def skin_chain(name, points, material, bone, subdiv=2):
    """Organic shape from a vertex chain + Skin modifier. points: [(xyz, (rx, ry))]."""
    me = bpy.data.meshes.new(name)
    verts = [p for p, _ in points]
    edges = [(i, i + 1) for i in range(len(points) - 1)]
    me.from_pydata(verts, edges, [])
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    obj.modifiers.new("skin", "SKIN")
    for i, (_, (rx, ry)) in enumerate(points):
        me.skin_vertices[0].data[i].radius = (rx, ry)
    me.skin_vertices[0].data[0].use_root = True
    smooth_obj(obj, subdiv=subdiv)
    obj.data.materials.append(material)
    if bone:
        obj["bone"] = bone
    return obj


# ---------------------------------------------------------------------------
# The kayak


def build_kayak():
    """A 3.9 m touring kayak: V hull, raised foredeck, hatches, deck lines."""
    L = 3.9
    stations = 40
    segs = 14
    bm = bmesh.new()
    rings = []
    for i in range(stations + 1):
        t = i / stations
        y = -L / 2 + t * L  # bow at -Y
        s = math.sin(math.pi * t)
        # Fine entry at the bow, fuller stern.
        taper = s ** (0.62 if t < 0.5 else 0.55)
        half_w = 0.31 * taper
        depth = 0.2 * (s**0.45)
        sheer = 0.13 + 0.07 * ((1 - t) ** 6) + 0.05 * (t**6)
        deck_crown = 0.09 * taper * (1.0 if 0.18 < t < 0.40 else 0.55)  # raised foredeck ahead of the cockpit
        if i in (0, stations):
            rings.append([bm.verts.new((0, y, sheer + 0.02))])
            continue
        ring = []
        for k in range(segs + 1):
            a = math.pi * k / segs
            x = math.cos(a) * half_w
            # V-shaped keel: flatten the sides, sharpen the bottom.
            z = sheer - (math.sin(a) ** 0.8) * depth - 0.03 * (1 - abs(math.cos(a))) * s
            ring.append(bm.verts.new((x, y, z)))
        # Deck arc from the right sheer back over to the left.
        for k in range(1, 6):
            a = math.pi * k / 6
            ring.append(bm.verts.new((-math.cos(a) * half_w, y, sheer + math.sin(a) * deck_crown)))
        rings.append(ring)
    n = segs + 1 + 5
    hull_faces, deck_faces, sheer_faces = [], [], []
    for i in range(stations):
        a, b = rings[i], rings[i + 1]
        for k in range(n):
            if len(a) == 1:
                f = bm.faces.new((a[0], b[(k + 1) % n], b[k]))
            elif len(b) == 1:
                f = bm.faces.new((a[k], a[(k + 1) % n], b[0]))
            else:
                f = bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
            if k >= segs:
                deck_faces.append(f)
            elif k in (0, segs - 1):
                sheer_faces.append(f)
            else:
                hull_faces.append(f)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new("kayak_hull")
    for m_ in (M["hull"], M["hull_under"], M["trim"]):
        me.materials.append(m_)
    for f in hull_faces:
        f.material_index = 1 if f.calc_center_median().z < 0.02 else 0
    for f in sheer_faces:
        f.material_index = 2
    bm.to_mesh(me)
    bm.free()
    hull = bpy.data.objects.new("kayak_hull", me)
    bpy.context.scene.collection.objects.link(hull)
    for p in me.polygons:
        p.use_smooth = True

    parts = [hull]
    # Cockpit coaming (a raised oval lip) and the spray skirt sealed over it.
    cx, cy, cz = 0.0, 0.18, 0.2
    coaming = bpy.data.meshes.new("coaming")
    bm = bmesh.new()
    rows = []
    for ring_i, (rx, ry, z) in enumerate(((0.27, 0.43, cz - 0.01), (0.285, 0.445, cz + 0.035), (0.265, 0.425, cz + 0.045), (0.25, 0.41, cz + 0.02))):
        row = [bm.verts.new((cx + math.cos(a) * rx, cy + math.sin(a) * ry, z)) for a in (i / 32 * math.tau for i in range(32))]
        rows.append(row)
    for r in range(len(rows) - 1):
        for i in range(32):
            bm.faces.new((rows[r][i], rows[r][(i + 1) % 32], rows[r + 1][(i + 1) % 32], rows[r + 1][i]))
    bm.to_mesh(coaming)
    bm.free()
    coaming.materials.append(M["trim"])
    co = bpy.data.objects.new("coaming", coaming)
    bpy.context.scene.collection.objects.link(co)
    for p in coaming.polygons:
        p.use_smooth = True
    parts.append(co)

    # Spray skirt: neoprene from the coaming up to the paddler's waist.
    bm = bmesh.new()
    rows = []
    for (rx, ry, z, oy) in ((0.255, 0.415, cz + 0.03, 0), (0.22, 0.3, cz + 0.07, 0.01), (0.17, 0.17, cz + 0.13, 0.02), (0.15, 0.13, cz + 0.17, 0.02)):
        rows.append([bm.verts.new((cx + math.cos(a) * rx, cy + oy + math.sin(a) * ry, z)) for a in (i / 32 * math.tau for i in range(32))])
    for r in range(len(rows) - 1):
        for i in range(32):
            bm.faces.new((rows[r][i], rows[r][(i + 1) % 32], rows[r + 1][(i + 1) % 32], rows[r + 1][i]))
    skirt = new_obj("spray_skirt", bm, M["neoprene"])
    for p in skirt.data.polygons:
        p.use_smooth = True
    parts.append(skirt)

    # Round hatch covers fore and aft, with rims.
    for y, r in ((-0.85, 0.14), (1.05, 0.17)):
        top = 0.13 + (0.09 * 0.55 if y > 0 else 0.07)
        parts.append(ellipsoid(f"hatch_{y}", Vector((0, y, top)), (r, r * 1.15, 0.03), M["rubber"], None, segs=24, rings=6))
    # Bungee cords criss-crossing the decks, and perimeter deck lines.
    def cord(a, b, radius=0.006, material=None):
        return capsule(f"cord_{len(parts)}", a, b, radius, radius, material or M["rubber"], None, segs=5, rings=1)

    for y0, y1, w in ((-1.35, -1.0, 0.16), (1.3, 1.6, 0.14)):
        z = 0.2 if y0 < 0 else 0.19
        parts.append(cord((-w, y0, z), (w, y1, z)))
        parts.append(cord((w, y0, z), (-w, y1, z)))
        parts.append(cord((-w, y0, z), (w, y0, z)))
    for side in (-1, 1):
        parts.append(cord((side * 0.24, -1.2, 0.17), (side * 0.27, -0.35, 0.18), 0.005, M["strap"]))
        parts.append(cord((side * 0.28, 0.75, 0.18), (side * 0.25, 1.5, 0.17), 0.005, M["strap"]))
    # Carry toggles and the rudder at the stern.
    parts.append(ellipsoid("toggle_bow", Vector((0, -1.96, 0.2)), (0.05, 0.02, 0.02), M["rubber"], None, segs=8, rings=4))
    parts.append(ellipsoid("toggle_stern", Vector((0, 1.97, 0.19)), (0.05, 0.02, 0.02), M["rubber"], None, segs=8, rings=4))
    rudder = bmesh.new()
    bmesh.ops.create_cube(rudder, size=1.0, matrix=Matrix.LocRotScale(Vector((0, 1.9, 0.02)), None, Vector((0.01, 0.12, 0.11))))
    parts.append(new_obj("rudder", rudder, M["trim"]))
    # Seat back visible behind the paddler.
    seat = bmesh.new()
    bmesh.ops.create_cube(seat, size=1.0, matrix=Matrix.LocRotScale(Vector((0, 0.42, 0.29)), Quaternion((1, 0, 0), -0.35), Vector((0.3, 0.05, 0.2))))
    s_obj = new_obj("seat_back", seat, M["seat"])
    smooth_obj(s_obj, subdiv=2)
    parts.append(s_obj)

    bpy.ops.object.select_all(action="DESELECT")
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = hull
    bpy.ops.object.join()
    hull.name = "kayak"
    hull.data.name = "kayak"
    return hull


# ---------------------------------------------------------------------------
# The paddler — rest pose is "holding the paddle across the deck"

SHOULDER = {1: Vector((0.2, 0.17, 0.615)), -1: Vector((-0.2, 0.17, 0.615))}
ELBOW = {1: Vector((0.37, 0.07, 0.47)), -1: Vector((-0.37, 0.07, 0.47))}
PADDLE_REST = Vector((0.0, -0.22, 0.56))
GRIP_OFFSET = 0.34
WRIST = {s: PADDLE_REST + Vector((s * GRIP_OFFSET, 0, 0)) for s in (1, -1)}


def build_paddler():
    parts = []
    # Torso (navy top) and hips down into the cockpit.
    parts.append(
        skin_chain(
            "torso",
            [
                ((0, 0.19, 0.18), (0.14, 0.11)),
                ((0, 0.18, 0.32), (0.135, 0.1)),
                ((0, 0.17, 0.48), (0.155, 0.105)),
                ((0, 0.165, 0.6), (0.172, 0.1)),
                ((0, 0.165, 0.67), (0.125, 0.085)),
                ((0, 0.165, 0.71), (0.065, 0.058)),
            ],
            M["shirt"],
            "chest",
        )
    )
    # Life vest (PFD): a thicker shell over the chest, with dark side panels.
    parts.append(
        skin_chain(
            "vest",
            [
                ((0, 0.18, 0.27), (0.172, 0.13)),
                ((0, 0.172, 0.4), (0.186, 0.142)),
                ((0, 0.168, 0.54), (0.188, 0.135)),
                ((0, 0.165, 0.64), (0.162, 0.112)),
                ((0, 0.165, 0.69), (0.09, 0.075)),
            ],
            M["vest"],
            "chest",
        )
    )
    for z in (0.39, 0.5):
        parts.append(ellipsoid(f"strap_{z}", Vector((0, 0.175, z)), (0.186, 0.142, 0.014), M["strap"], "chest", segs=24, rings=4))
        parts.append(ellipsoid(f"buckle_{z}", Vector((0, 0.035, z)), (0.03, 0.008, 0.016), M["buckle"], "chest", segs=8, rings=4))
    # Dark side panels of the PFD.
    for s in (1, -1):
        parts.append(ellipsoid(f"vest_panel_{s}", Vector((s * 0.17, 0.17, 0.44)), (0.03, 0.1, 0.13), M["vest_dark"], "chest", segs=12, rings=8))
    # Neck and head.
    parts.append(capsule("neck", (0, 0.17, 0.64), (0, 0.16, 0.76), 0.052, 0.048, M["skin"], "head", segs=12, rings=2))
    head_c = Vector((0, 0.15, 0.86))
    parts.append(ellipsoid("head", head_c, (0.088, 0.1, 0.112), M["skin"], "head", segs=20, rings=14))
    parts.append(ellipsoid("jaw", head_c + Vector((0, -0.018, -0.048)), (0.07, 0.078, 0.064), M["skin"], "head", segs=16, rings=8))
    parts.append(ellipsoid("nose", head_c + Vector((0, -0.097, -0.012)), (0.011, 0.016, 0.022), M["skin"], "head", segs=8, rings=6))
    for s in (1, -1):
        parts.append(ellipsoid(f"ear_{s}", head_c + Vector((s * 0.088, 0.01, -0.005)), (0.012, 0.025, 0.035), M["skin"], "head", segs=8, rings=6))
    # Hair under the cap, and a ponytail through the back strap.
    parts.append(ellipsoid("hair", head_c + Vector((0, 0.018, 0.012)), (0.093, 0.1, 0.108), M["hair"], "head", segs=20, rings=12))
    parts.append(capsule("ponytail", head_c + Vector((0, 0.09, -0.01)), head_c + Vector((0, 0.14, -0.2)), 0.03, 0.012, M["hair"], "head", segs=10, rings=3))
    # Cap: crown + brim pointing forward.
    parts.append(ellipsoid("cap", head_c + Vector((0, 0.005, 0.045)), (0.097, 0.105, 0.075), M["cap"], "head", segs=20, rings=10))
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=20, radius=1.0)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(head_c + Vector((0, -0.105, 0.045))) @ Matrix.Rotation(-0.18, 4, "X") @ Matrix.Diagonal((0.085, 0.07, 1, 1)), verts=bm.verts[:])
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.008)
    brim = new_obj("brim", bm, M["cap"], "head")
    parts.append(brim)
    # Sunglasses.
    for s in (1, -1):
        parts.append(ellipsoid(f"lens_{s}", head_c + Vector((s * 0.034, -0.093, 0.015)), (0.026, 0.008, 0.017), M["glasses"], "head", segs=12, rings=6))
    parts.append(capsule("glasses_bridge", head_c + Vector((-0.07, -0.085, 0.018)), head_c + Vector((0.07, -0.085, 0.018)), 0.004, 0.004, M["glasses"], "head", segs=5, rings=1))

    # Arms: long navy sleeves, bare hands.
    for s in (1, -1):
        side = "L" if s > 0 else "R"
        sh, el, wr = SHOULDER[s], ELBOW[s], WRIST[s]
        parts.append(ellipsoid(f"deltoid_{side}", sh, (0.072, 0.072, 0.066), M["shirt"], f"upperarm.{side}", segs=14, rings=8))
        parts.append(capsule(f"upperarm_{side}", sh, el, 0.06, 0.048, M["shirt"], f"upperarm.{side}", segs=14, rings=3))
        parts.append(ellipsoid(f"elbow_{side}", el, (0.046, 0.046, 0.046), M["shirt"], f"forearm.{side}", segs=12, rings=6))
        cuff = el + (wr - el) * 0.86
        parts.append(capsule(f"forearm_{side}", el, cuff, 0.048, 0.038, M["shirt"], f"forearm.{side}", segs=14, rings=3))
        parts.append(capsule(f"wrist_{side}", cuff, wr, 0.03, 0.028, M["skin"], f"forearm.{side}", segs=10, rings=2))
        # Fist wrapped around the shaft (the shaft runs along X through the wrist point).
        parts.append(ellipsoid(f"fist_{side}", wr + Vector((0, 0.005, 0.012)), (0.05, 0.045, 0.048), M["skin"], f"hand.{side}", segs=14, rings=8))
        parts.append(ellipsoid(f"thumb_{side}", wr + Vector((-s * 0.028, -0.03, 0.02)), (0.018, 0.028, 0.016), M["skin"], f"hand.{side}", segs=8, rings=5))

    # Paddle (skinned to the paddle bone so it moves with the rig).
    parts.append(capsule("shaft", PADDLE_REST + Vector((-1.12, 0, 0)), PADDLE_REST + Vector((1.12, 0, 0)), 0.016, 0.016, M["shaft"], "paddle", segs=10, rings=1))
    for s in (1, -1):
        feather = 0.0 if s > 0 else math.radians(35)
        centre = PADDLE_REST + Vector((s * 1.27, 0, 0))
        rot = Matrix.Rotation(feather, 3, "X")
        parts.append(ellipsoid(f"blade_{s}", centre, (0.24, 0.012, 0.085), M["blade"], "paddle", segs=20, rings=8, rot=rot))
        parts.append(ellipsoid(f"blade_tip_{s}", centre + Vector((s * 0.1, 0, 0)), (0.12, 0.013, 0.07), M["blade_tip"], "paddle", segs=14, rings=6, rot=rot))
        for d in (0.72, 0.78):
            parts.append(ellipsoid(f"drip_ring_{s}_{d}", PADDLE_REST + Vector((s * d, 0, 0)), (0.006, 0.04, 0.04), M["rubber"], "paddle", segs=16, rings=4))
    return parts


# ---------------------------------------------------------------------------
# Rig


def build_armature():
    arm_data = bpy.data.armatures.new("kayaker_rig")
    arm = bpy.data.objects.new("kayaker_rig", arm_data)
    bpy.context.scene.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm_data.edit_bones

    def bone(name, head, tail, parent=None):
        b = eb.new(name)
        b.head = head
        b.tail = tail
        b.roll = 0
        if parent:
            b.parent = eb[parent]
        return b

    bone("root", (0, 0.18, 0.0), (0, 0.18, 0.15))
    bone("spine", (0, 0.18, 0.2), (0, 0.17, 0.42), "root")
    bone("chest", (0, 0.17, 0.42), (0, 0.165, 0.64), "spine")
    bone("head", (0, 0.165, 0.66), (0, 0.15, 0.92), "chest")
    for s in (1, -1):
        side = "L" if s > 0 else "R"
        bone(f"upperarm.{side}", SHOULDER[s], ELBOW[s], "chest")
        bone(f"forearm.{side}", ELBOW[s], WRIST[s], f"upperarm.{side}").use_connect = True
        bone(f"hand.{side}", WRIST[s], WRIST[s] + Vector((s * 0.06, -0.02, 0)), f"forearm.{side}").use_connect = True
        bone(f"grip.{side}", WRIST[s], WRIST[s] + Vector((0, 0, 0.06)), "paddle" if "paddle" in eb else None)
        bone(f"pole.{side}", Vector((s * 0.75, 0.45, 0.25)), Vector((s * 0.75, 0.45, 0.32)), "root")
    bone("paddle", PADDLE_REST, PADDLE_REST + Vector((0, 0, 0.1)), "root")
    for side in ("L", "R"):
        eb[f"grip.{side}"].parent = eb["paddle"]
    bpy.ops.object.mode_set(mode="OBJECT")

    # Arms follow the paddle grips (2-bone IK, elbows out and down).
    for side in ("L", "R"):
        pb = arm.pose.bones[f"forearm.{side}"]
        ik = pb.constraints.new("IK")
        ik.target = arm
        ik.subtarget = f"grip.{side}"
        ik.pole_target = arm
        ik.pole_subtarget = f"pole.{side}"
        ik.pole_angle = math.radians(-90 if side == "L" else -90)
        ik.chain_count = 2
        hand = arm.pose.bones[f"hand.{side}"]
        cr = hand.constraints.new("COPY_ROTATION")
        cr.target = arm
        cr.subtarget = f"grip.{side}"
        cr.mix_mode = "BEFORE"
    return arm


def rotate_about(pose_bone, pivot, rot_q, parent_world=Matrix.Identity(4)):
    """Set a pose bone's armature-space matrix: rest, rotated by rot_q about pivot (armature space)."""
    rest = pose_bone.bone.matrix_local
    m = Matrix.Translation(pivot) @ rot_q.to_matrix().to_4x4() @ Matrix.Translation(-pivot)
    pose_bone.matrix = parent_world @ m @ rest


def key_pose(arm, frame, paddle_center, yaw, roll, chest_yaw, chest_lean, head_yaw):
    bpy.context.scene.frame_set(frame)
    pb = arm.pose.bones
    # Paddle: rest pose rotated (yaw about Z, then roll about the fore-aft axis) and moved.
    q = Quaternion((0, 0, 1), yaw) @ Quaternion((0, 1, 0), roll)
    rest = pb["paddle"].bone.matrix_local
    pb["paddle"].matrix = Matrix.Translation(paddle_center) @ q.to_matrix().to_4x4() @ Matrix.Translation(-PADDLE_REST) @ rest
    # Torso winds up toward the stroke side and leans into it.
    chest_q = Quaternion((0, 0, 1), chest_yaw) @ Quaternion((1, 0, 0), chest_lean)
    chest_pivot = pb["chest"].bone.head_local
    rotate_about(pb["chest"], chest_pivot, chest_q)
    bpy.context.view_layer.update()
    # The head keeps looking ahead (counter-rotates).
    head_pivot = pb["head"].bone.head_local
    chest_m = Matrix.Translation(chest_pivot) @ chest_q.to_matrix().to_4x4() @ Matrix.Translation(-chest_pivot)
    head_q = Quaternion((0, 0, 1), head_yaw)
    rotate_about(pb["head"], chest_m @ head_pivot, head_q @ chest_q)
    bpy.context.view_layer.update()
    for name in ("paddle", "chest", "head"):
        pb[name].keyframe_insert("location", frame=frame)
        pb[name].keyframe_insert("rotation_quaternion", frame=frame)


def ease(t):
    return t * t * (3 - 2 * t)


def animate(arm):
    scene = bpy.context.scene
    scene.render.fps = FPS
    for pb in arm.pose.bones:
        pb.rotation_mode = "QUATERNION"

    def paddle_action():
        act = bpy.data.actions.new("src_paddle")
        arm.animation_data_create()
        arm.animation_data.action = act
        for f in range(PADDLE_FRAMES + 1):
            t = f / PADDLE_FRAMES
            side = 1 if t < 0.5 else -1  # left (+X) blade first
            s = (t % 0.5) / 0.5
            e = ease(s)
            dip = math.sin(math.pi * s)
            # Left stroke: +X blade from the bow (yaw -0.55) back to the hip (+0.55).
            yaw = (-0.55 + 1.1 * e) * side
            roll = 0.62 * dip * side  # +X end down when side = +1
            centre = PADDLE_REST + Vector((-side * 0.05 * dip, 0.08 * e - 0.02, 0.05 * dip))
            chest_yaw = -yaw * 0.42
            key_pose(arm, f + 1, centre, yaw, roll, chest_yaw, 0.08 * dip, -chest_yaw * 0.7)
        return act

    def idle_action():
        act = bpy.data.actions.new("src_idle")
        arm.animation_data.action = act
        for f in range(IDLE_FRAMES + 1):
            t = f / IDLE_FRAMES
            breath = math.sin(t * math.tau)
            centre = PADDLE_REST + Vector((0, 0.03, -0.04 + 0.01 * breath))
            key_pose(arm, f + 1, centre, 0.0, 0.03 * math.sin(t * math.tau * 0.5), 0.0, -0.02 + 0.012 * breath, 0.08 * math.sin(t * math.tau * 0.5))
        return act

    baked = {}
    for name, builder, frames in (("Paddle", paddle_action, PADDLE_FRAMES), ("Idle", idle_action, IDLE_FRAMES)):
        src = builder()
        scene.frame_start = 1
        scene.frame_end = frames + 1
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.mode_set(mode="POSE")
        bpy.ops.pose.select_all(action="SELECT")
        bpy.ops.nla.bake(
            frame_start=1,
            frame_end=frames + 1,
            only_selected=False,
            visual_keying=True,
            clear_constraints=False,
            use_current_action=False,
            bake_types={"POSE"},
        )
        bpy.ops.object.mode_set(mode="OBJECT")
        act = arm.animation_data.action
        act.name = name
        act.use_fake_user = True
        baked[name] = act
        bpy.data.actions.remove(src)

    # Drop the constraints now that the motion is baked, and stash both clips
    # on NLA tracks so the glTF exporter writes them as separate animations.
    for pb in arm.pose.bones:
        for c in list(pb.constraints):
            pb.constraints.remove(c)
    arm.animation_data.action = None
    for name, act in baked.items():
        track = arm.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, act)
    return baked


def skin_to_rig(parts, arm):
    """Join the parts into one mesh, each rigidly weighted to its bone."""
    for obj in parts:
        bone = obj.get("bone")
        vg = obj.vertex_groups.new(name=bone)
        vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    body.name = "kayaker"
    body.data.name = "kayaker"
    mod = body.modifiers.new("rig", "ARMATURE")
    mod.object = arm
    body.parent = arm
    return body


def main():
    reset_scene()
    materials()
    kayak = build_kayak()
    parts = build_paddler()
    arm = build_armature()
    body = skin_to_rig(parts, arm)
    animate(arm)
    bpy.context.scene.frame_set(1)

    tris = sum(len(p.vertices) - 2 for o in (kayak, body) for p in o.data.polygons)
    print(f"player: kayak {len(kayak.data.polygons)} faces, kayaker {len(body.data.polygons)} faces, ~{tris} tris")

    path = os.path.join(BUILD_DIR, "player.glb")
    os.makedirs(BUILD_DIR, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for o in (kayak, body, arm):
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_normals=True,
        export_texcoords=False,
        export_materials="EXPORT",
        export_vertex_color="NONE",
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_skins=True,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
    )
    print(f"exported {path} ({os.path.getsize(path) // 1024} KB)")
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(BUILD_DIR, "player.blend"))


main()
