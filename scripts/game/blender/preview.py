"""Renders a quick Workbench preview of a built .blend (asset QA).

    blender -b scripts/game/.build/props.blend -P scripts/game/blender/preview.py -- out.png [az] [el] [dist_mul]
"""

import math
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
out = argv[0] if argv else "//preview.png"
az = math.radians(float(argv[1])) if len(argv) > 1 else math.radians(35)
el = math.radians(float(argv[2])) if len(argv) > 2 else math.radians(30)
dist_mul = float(argv[3]) if len(argv) > 3 else 1.0

scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == "MESH"]
only = argv[4].split(",") if len(argv) > 4 else None
if only:
    # Line the chosen objects up in a row, hide the rest.
    x = 0.0
    for o in meshes:
        if o.name not in only:
            o.hide_render = True
    meshes = [o for name in only for o in meshes if o.name == name]
    for o in meshes:
        w = o.dimensions.x
        o.location = (x + w / 2, 0, 0)
        x += w + 1.5
    bpy.context.view_layer.update()
pts = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
centre = (lo + hi) / 2
radius = (hi - lo).length / 2

cam_data = bpy.data.cameras.new("preview")
cam_data.lens = 40
cam_data.clip_end = 10000
cam = bpy.data.objects.new("preview", cam_data)
scene.collection.objects.link(cam)
d = radius * 2.1 * dist_mul
cam.location = centre + Vector((math.cos(el) * math.sin(az), -math.cos(el) * math.cos(az), math.sin(el))) * d
cam.rotation_euler = (centre - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

scene.render.engine = "BLENDER_WORKBENCH"
shading = scene.display.shading
shading.light = "STUDIO"
shading.color_type = "VERTEX"
shading.show_shadows = True
shading.show_cavity = True
scene.world = scene.world or bpy.data.worlds.new("w")
scene.world.color = (0.55, 0.6, 0.65)
scene.render.resolution_x = 1400
scene.render.resolution_y = 900
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
print("preview:", out)
