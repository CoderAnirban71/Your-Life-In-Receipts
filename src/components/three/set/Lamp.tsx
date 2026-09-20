import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../../../lib/world'
import { DESK_Y, ease } from './shared'

const coneVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`
const coneFrag = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    // brightest near the bulb, fading toward the desk; soft at the silhouette
    float along = pow(vUv.y, 1.6);
    float rim = pow(abs(dot(normalize(vN), normalize(vV))), 1.3);
    float rays = 0.85 + 0.15 * sin(vUv.x * 60.0 + uTime * 0.6) * sin(vUv.x * 23.0 - uTime * 0.4);
    float a = uOpacity * along * rim * rays;
    gl_FragColor = vec4(vec3(1.0, 0.78, 0.42) * a, a);
  }
`

/**
 * The desk lamp: the one light source the whole story is read by. A real spot light
 * for shading plus a fake volumetric cone so the beam itself is visible in the air.
 */
export function Lamp({ position = [-7.8, 1.2, -5.6] as [number, number, number], target = [2.2, DESK_Y + 0.6, 0] as [number, number, number] }) {
  const targetObj = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(...target)
    return o
  }, [target])
  const bulb = useRef<THREE.Mesh>(null)
  const spot = useRef<THREE.SpotLight>(null)
  const cone = useRef<THREE.Mesh>(null)

  const coneGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(2.6, 6.2, 48, 1, true)
    g.translate(0, -3.1, 0) // apex at the origin
    g.rotateX(-Math.PI / 2) // beam runs along +z so lookAt() aims it
    return g
  }, [])
  const coneMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0.32 }, uTime: { value: 0 } },
        vertexShader: coneVert,
        fragmentShader: coneFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  )
  useEffect(() => () => {
    coneGeo.dispose()
    coneMat.dispose()
  }, [coneGeo, coneMat])

  useEffect(() => {
    cone.current?.lookAt(targetObj.position)
  }, [targetObj])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    coneMat.uniforms.uTime.value = t
    // the lamp is the star of act I; it dims to a glow once the story moves on
    const want = 0.3 * (0.35 + 0.65 * world.w.hook) + 0.06 * world.w.roll
    coneMat.uniforms.uOpacity.value += (want - coneMat.uniforms.uOpacity.value) * ease(dt, 3)
    // a barely-there flicker, like a real filament
    const flick = 1 + Math.sin(t * 17.3) * 0.012 + Math.sin(t * 5.1) * 0.02
    if (spot.current) spot.current.intensity = (140 + 120 * world.w.hook) * flick
    if (bulb.current) (bulb.current.material as THREE.MeshStandardMaterial).emissiveIntensity = 5.5 * flick
  })

  return (
    <group position={position}>
      <primitive object={targetObj} />
      {/* pole from the desk, a hinge, the shade */}
      <mesh position={[0, (DESK_Y - position[1]) / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.05, position[1] - DESK_Y, 12]} />
        <meshStandardMaterial color="#2a2530" roughness={0.5} metalness={0.7} />
      </mesh>
      <mesh position={[0, DESK_Y - position[1] + 0.02, 0]}>
        <cylinderGeometry args={[0.55, 0.6, 0.06, 32]} />
        <meshStandardMaterial color="#1f1b25" roughness={0.5} metalness={0.6} />
      </mesh>
      <group rotation={[0.35, 0.9, -0.6]}>
        <mesh position={[0, -0.1, 0]}>
          <coneGeometry args={[0.62, 0.7, 40, 1, true]} />
          <meshStandardMaterial color="#1c1822" roughness={0.45} metalness={0.7} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={bulb} position={[0, -0.28, 0]}>
          <sphereGeometry args={[0.13, 20, 20]} />
          <meshStandardMaterial color="#fff3d6" emissive="#ffc46b" emissiveIntensity={5} toneMapped={false} />
        </mesh>
      </group>
      <spotLight ref={spot} target={targetObj} angle={0.5} penumbra={0.75} intensity={220} color="#ffcf82" decay={1.5} distance={30} />
      <mesh ref={cone} geometry={coneGeo} material={coneMat} position={[0, -0.3, 0]} />
    </group>
  )
}
