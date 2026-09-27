"use client"

import { useFrame } from "@react-three/fiber"
import { useMemo } from "react"
import {
  DataTexture,
  LinearFilter,
  PlaneGeometry,
  RedFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector4,
} from "three"
import { useGame } from "./context"

const VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const FRAG = /* glsl */ `
uniform float uTime;
uniform sampler2D uShore;
uniform vec4 uShoreRect;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSun;
uniform vec3 uSunDir;
uniform vec3 uFog;
uniform vec2 uFogRange;
varying vec3 vWorld;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
// Height of the ripples; the Nile flows north (-z), so they drift that way.
float waves(vec2 p) {
  float t = uTime;
  return noise(p * 0.22 + vec2(0.0, t * 0.12)) * 0.6
       + noise(p * 0.61 + vec2(t * 0.05, t * 0.3)) * 0.3
       + noise(p * 1.7 + vec2(-t * 0.2, t * 0.45)) * 0.1;
}

void main() {
  vec2 p = vWorld.xz;
  vec2 uv = (p - uShoreRect.xy) / uShoreRect.zw;
  float depth = 1.0;
  if (uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0) depth = texture2D(uShore, uv).r;

  float e = 0.35;
  float h0 = waves(p);
  vec3 n = normalize(vec3((h0 - waves(p + vec2(e, 0.0))) * 1.6, 1.0, (h0 - waves(p + vec2(0.0, e))) * 1.6));

  vec3 toCam = cameraPosition - vWorld;
  float dist = length(toCam);
  vec3 v = toCam / dist;
  // Calm the normals with distance so the far river doesn't shimmer.
  n = normalize(mix(n, vec3(0.0, 1.0, 0.0), smoothstep(80.0, 600.0, dist) * 0.8));

  vec3 base = mix(uShallow, uDeep, smoothstep(0.0, 0.55, depth));
  float fresnel = 0.04 + 0.9 * pow(1.0 - max(dot(n, v), 0.0), 4.0);
  vec3 r = reflect(-v, n);
  vec3 sky = mix(uSkyHorizon, uSkyTop, clamp(r.y * 1.6, 0.0, 1.0));
  vec3 col = mix(base, sky, fresnel);

  // The sunset's glitter path across the river.
  float s = max(dot(r, uSunDir), 0.0);
  col += uSun * (pow(s, 220.0) * 2.5 + pow(s, 18.0) * 0.22);

  // Foam where the river meets the bank, pulsing gently.
  float fn = noise(p * 0.9 + vec2(uTime * 0.3, -uTime * 0.2));
  float foam = smoothstep(0.075, 0.02, depth + fn * 0.035);
  foam += smoothstep(0.55, 0.95, sin(depth * 70.0 - uTime * 1.6)) * smoothstep(0.16, 0.05, depth) * 0.35;
  col = mix(col, vec3(0.96, 0.95, 0.9), clamp(foam, 0.0, 1.0) * 0.85);

  col = mix(col, uFog, smoothstep(uFogRange.x, uFogRange.y, dist));
  // Clear in the shallows (the riverbed shows through), opaque in the channel.
  float alpha = mix(0.5, 0.97, smoothstep(0.0, 0.22, depth)) + foam * 0.3;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

/** The Nile: one big plane, shaded from the shoreline distance field. */
export function Water() {
  const { runtime, frame } = useGame()
  const { shore } = runtime.data

  const material = useMemo(() => {
    // Depth proxy: 0 at the bank → 1 in open water (~14 units out).
    const px = new Uint8Array(shore.nx * shore.nz)
    for (let i = 0; i < px.length; i++) px[i] = Math.max(0, Math.min(255, Math.round((-shore.data[i] / 14) * 255)))
    const tex = new DataTexture(px, shore.nx, shore.nz, RedFormat, UnsignedByteType)
    tex.magFilter = LinearFilter
    tex.minFilter = LinearFilter
    tex.needsUpdate = true
    return new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uShore: { value: tex },
        uShoreRect: {
          value: new Vector4(shore.minX, shore.minZ, (shore.nx - 1) * shore.cell, (shore.nz - 1) * shore.cell),
        },
        uDeep: { value: frame.sky.waterDeep },
        uShallow: { value: frame.sky.waterShallow },
        uSkyTop: { value: frame.sky.skyTop },
        uSkyHorizon: { value: frame.sky.skyHorizon },
        uSun: { value: frame.sky.sun },
        uSunDir: { value: frame.sky.sunDir },
        uFog: { value: frame.sky.fog },
        uFogRange: { value: [220, 1500] },
      },
      transparent: true,
    })
  }, [shore, frame])

  const geometry = useMemo(() => {
    const g = new PlaneGeometry(4000, 4000, 1, 1)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  useFrame(() => {
    material.uniforms.uTime.value = frame.clock
  })

  return <mesh geometry={geometry} material={material} renderOrder={0} />
}
