"use client"

import { useGLTF } from "@react-three/drei"
import { useMemo } from "react"
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  type Material,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  type Texture,
} from "three"

export const MODEL_URLS = {
  world: "/game/models/world.glb",
  props: "/game/models/props.glb",
  player: "/game/models/player.glb",
} as const

// ---------------------------------------------------------------------------
// Materials: PBR, vertex-coloured (colours carry the Blender-baked AO).

let terrainMat: MeshStandardMaterial | null = null
const propMats = new Map<string, MeshStandardMaterial>()

/**
 * Terrain: matte, vertex-coloured, with a world-space grain so sand, fields
 * and rock never read as flat paint up close.
 */
export function terrainMaterial() {
  if (terrainMat) return terrainMat
  terrainMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0 })
  terrainMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vGrainPos;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvGrainPos = (modelMatrix * vec4(transformed, 1.0)).xyz;")
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vGrainPos;
float grainHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float grainNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(grainHash(i), grainHash(i + vec2(1, 0)), u.x), mix(grainHash(i + vec2(0, 1)), grainHash(i + vec2(1, 1)), u.x), u.y);
}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float grain = grainNoise(vGrainPos.xz * 0.9) * 0.6 + grainNoise(vGrainPos.xz * 4.1) * 0.4;
diffuseColor.rgb *= 0.86 + 0.26 * grain;`,
      )
  }
  return terrainMat
}

/** Material per surface kind — glossy rubber duck, satin paint on boats, matte everything else. */
export function propMaterial(kind: "default" | "glossy" | "satin" = "default") {
  let m = propMats.get(kind)
  if (!m) {
    m = new MeshStandardMaterial({
      vertexColors: true,
      side: DoubleSide,
      roughness: kind === "glossy" ? 0.28 : kind === "satin" ? 0.55 : 0.88,
      metalness: 0,
    })
    propMats.set(kind, m)
  }
  return m
}

const foliageMats = new Map<Texture, MeshStandardMaterial>()
function foliageMaterial(map: Texture) {
  let m = foliageMats.get(map)
  if (!m) {
    m = new MeshStandardMaterial({ map, vertexColors: true, alphaTest: 0.45, side: DoubleSide, roughness: 0.9, metalness: 0 })
    foliageMats.set(map, m)
  }
  return m
}

function surfaceFor(name: string): "default" | "glossy" | "satin" {
  if (name === "duckling") return "glossy"
  if (["felucca", "motorboat", "cruise", "nest"].includes(name)) return "satin"
  return "default"
}

// ---------------------------------------------------------------------------

/**
 * Bakes a glTF mesh node into a standalone float geometry.
 *
 * The asset pipeline quantises vertex data (KHR_mesh_quantization), which
 * leaves attributes as normalised ints with a compensating node transform.
 * Instancing needs the geometry in plain model space, so dequantise and apply
 * the node's world matrix here, once.
 */
function bake(mesh: Mesh): BufferGeometry {
  mesh.updateWorldMatrix(true, false)
  const src = mesh.geometry
  const geo = new BufferGeometry()
  for (const name of ["position", "normal", "color", "uv"] as const) {
    const attr = src.getAttribute(name)
    if (!attr) continue
    const size = attr.itemSize
    const out = new Float32Array(attr.count * size)
    for (let i = 0; i < attr.count; i++) {
      out[i * size] = attr.getX(i)
      if (size > 1) out[i * size + 1] = attr.getY(i)
      if (size > 2) out[i * size + 2] = attr.getZ(i)
      if (size > 3) out[i * size + 3] = attr.getW(i)
    }
    geo.setAttribute(name, new BufferAttribute(out, size))
  }
  if (src.index) geo.setIndex(src.index.clone())
  geo.applyMatrix4(mesh.matrixWorld)
  if (!geo.getAttribute("normal")) geo.computeVertexNormals()
  geo.computeBoundingSphere()
  return geo
}

export interface PropPart {
  geometry: BufferGeometry
  material: Material
}
export type PropParts = Record<string, PropPart>

/**
 * Every prop part by object name (duckling, palm_0, palm_0__leaves, house_3, …).
 * "<prop>__<part>" objects are companions drawn wherever <prop> is drawn.
 */
export function usePropParts(): PropParts {
  const gltf = useGLTF(MODEL_URLS.props)
  return useMemo(() => {
    const out: PropParts = {}
    gltf.scene.traverse((o: Object3D) => {
      const mesh = o as Mesh
      if (!mesh.isMesh) return
      const src = mesh.material as MeshStandardMaterial
      const base = o.name.split("__")[0]
      out[o.name] = {
        geometry: bake(mesh),
        material: src.map ? foliageMaterial(src.map) : propMaterial(surfaceFor(base)),
      }
    })
    return out
  }, [gltf])
}

/** Geometry-only view, for components that bring their own material. */
export function usePropGeometries(): Record<string, BufferGeometry> {
  const parts = usePropParts()
  return useMemo(() => Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v.geometry])), [parts])
}

/** Names of all parts drawn for a prop (itself plus its "__" companions). */
export function partsOf(parts: PropParts, name: string): string[] {
  const out = parts[name] ? [name] : []
  for (const key of Object.keys(parts)) if (key.startsWith(`${name}__`)) out.push(key)
  return out
}

export function preloadModels() {
  useGLTF.preload(MODEL_URLS.world)
  useGLTF.preload(MODEL_URLS.props)
  useGLTF.preload(MODEL_URLS.player)
}
