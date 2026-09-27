"""Renders the kayaker at key animation poses (asset QA).

    blender -b scripts/game/.build/player.blend -P scripts/game/blender/preview_player.py -- out_dir [az_deg] [el_deg]
"""

import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :]
out_dir = argv[0]
az = math.radians(float(argv[1]) if len(argv) > 1 else 210)
el = math.radians(float(argv[2]) if len(argv) > 2 else 18)

scene = bpy.context.scene
arm = bpy.data.objects["kayaker_rig"]
for t in arm.animation_data.nla_tracks:
    t.mute = True

target = Vector((0, 0.0, 0.35))
cam_data = bpy.data.cameras.new("qa")
cam_data.lens = 45
cam = bpy.data.objects.new("qa", cam_data)
scene.collection.objects.link(cam)
d = 4.6
cam.location = target + Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el))) * d
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.camera = cam

sun = bpy.data.lights.new("sun", "SUN")
sun.energy = 4
sun.angle = math.radians(3)
so = bpy.data.objects.new("sun", sun)
so.rotation_euler = (math.radians(50), 0, math.radians(-40))
scene.collection.objects.link(so)
scene.world = scene.world or bpy.data.worlds.new("w")
scene.world.color = (0.45, 0.55, 0.7)

scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 700
scene.render.resolution_y = 520
scene.view_settings.view_transform = "AgX"

poses = [("idle", "Idle", 1), ("left_catch", "Paddle", 2), ("left_mid", "Paddle", 9), ("right_mid", "Paddle", 24)]
os.makedirs(out_dir, exist_ok=True)
for name, action, frame in poses:
    arm.animation_data.action = bpy.data.actions[action]
    scene.frame_set(frame)
    scene.render.filepath = os.path.join(out_dir, f"player_{name}.png")
    bpy.ops.render.render(write_still=True)
print("done")
