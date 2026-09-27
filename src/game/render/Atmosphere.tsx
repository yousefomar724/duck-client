"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useMemo, useRef } from "react"
import {
  BackSide,
  Fog,
  type DirectionalLight,
  type HemisphereLight,
  Mesh,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  type WebGLRenderTarget,
} from "three"
import type { Pose } from "../runtime/runtime"
import { useGame } from "./context"
import { sampleSky } from "./timeOfDay"

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // pin to the far plane
}`

const SKY_FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uHorizon;
uniform vec3 uSun;
uniform vec3 uSunDir;
uniform vec3 uFog;
varying vec3 vDir;
void main() {
  vec3 dir = normalize(vDir);
  float h = dir.y;
  vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.65, h), 0.65));
  // Warm band hugging the horizon on the sunset side.
  float sunSide = max(dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(uSunDir.x, 0.0, uSunDir.z))), 0.0);
  col = mix(col, uSun, pow(sunSide, 3.0) * (1.0 - smoothstep(0.0, 0.35, h)) * 0.45);
  float d = max(dot(dir, uSunDir), 0.0);
  col += uSun * (smoothstep(0.9990, 0.9995, d) * 3.0 + pow(d, 60.0) * 0.8 + pow(d, 8.0) * 0.18);
  // Below the horizon fade into the ground haze.
  col = mix(col, uFog, smoothstep(0.02, -0.12, h));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

/** Sky dome, sun, hemisphere light and fog — all driven by the sunset clock. */
export function Atmosphere() {
  const { frame, runtime } = useGame()
  const scene = useThree((s) => s.scene)
  const gl = useThree((s) => s.gl)
  const sky = useRef<Mesh>(null)
  const sun = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const pose = useMemo<Pose>(() => ({ x: 0, z: 0, heading: 0 }), [])
  const envU = useRef(-1)
  const envTarget = useRef<WebGLRenderTarget | null>(null)
  const pmrem = useMemo(() => new PMREMGenerator(gl), [gl])
  const shadowSize = typeof window !== "undefined" && Math.min(window.innerWidth, window.innerHeight) < 700 ? 1024 : 2048

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        uniforms: {
          uTop: { value: frame.sky.skyTop },
          uHorizon: { value: frame.sky.skyHorizon },
          uSun: { value: frame.sky.sun },
          uSunDir: { value: frame.sky.sunDir },
          uFog: { value: frame.sky.fog },
        },
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [frame],
  )
  const geometry = useMemo(() => new SphereGeometry(1000, 32, 16), [])

  useEffect(() => {
    scene.fog = new Fog(frame.sky.fog.getHex(), 220, 1500)
    return () => {
      scene.fog = null
    }
  }, [scene, frame])

  // A sky-only scene for the environment map (reflections on the kayak, boats
  // and water-polished granite, plus sky-tinted ambient light).
  const envScene = useMemo(() => {
    const s = new Scene()
    s.add(new Mesh(geometry, material))
    return s
  }, [geometry, material])
  useEffect(
    () => () => {
      envTarget.current?.dispose()
      pmrem.dispose()
      scene.environment = null
    },
    [pmrem, scene],
  )

  useFrame(({ camera }) => {
    sampleSky(frame.u, frame.sky)
    if (scene.fog) (scene.fog as Fog).color.copy(frame.sky.fog)
    if (sky.current) sky.current.position.copy(camera.position)

    // Re-bake the environment only when the light has visibly changed.
    if (Math.abs(frame.u - envU.current) > 0.04) {
      envU.current = frame.u
      const next = pmrem.fromScene(envScene, 0, 1, 2000)
      envTarget.current?.dispose()
      envTarget.current = next
      scene.environment = next.texture
      scene.environmentIntensity = 0.55
    }

    if (sun.current) {
      // The shadow box follows the player so it stays sharp on a phone.
      runtime.pose(pose)
      const s = sun.current
      s.color.copy(frame.sky.sun)
      s.intensity = frame.sky.sunIntensity
      s.target.position.set(pose.x, 0, pose.z)
      s.position.copy(frame.sky.sunDir).multiplyScalar(160).add(s.target.position)
      s.target.updateMatrixWorld()
    }
    if (hemi.current) {
      hemi.current.color.copy(frame.sky.hemiSky)
      hemi.current.groundColor.copy(frame.sky.hemiGround)
      hemi.current.intensity = frame.sky.hemiIntensity * 0.55
    }
  })

  return (
    <>
      <mesh ref={sky} geometry={geometry} material={material} frustumCulled={false} renderOrder={-1} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize-width={shadowSize}
        shadow-mapSize-height={shadowSize}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
        shadow-camera-near={10}
        shadow-camera-far={400}
        shadow-bias={-0.0004}
        shadow-normalBias={0.06}
      />
      <hemisphereLight ref={hemi} />
    </>
  )
}
