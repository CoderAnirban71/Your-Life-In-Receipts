import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { world } from '../../../lib/world'
import { makeLabelSprite } from '../labelSprite'
import { makeCurledPlane } from '../paperTexture'
import { DESK_Y, ease } from './shared'

const COUNT = 42
const RADIUS = 2.4
const HEIGHT = 7
export const HELIX_POS: [number, number, number] = [5.0, DESK_Y + 0.4, -4.5]

/**
 * The credits: every receipt in the room gathers into one slow spiral — a single
 * roll of paper, four years long, turning under the lamp.
 */
export function EndHelix({ pool }: { pool: THREE.CanvasTexture[] }) {
  const group = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const meshes = useRef<THREE.Mesh[]>([])
  const geo = useMemo(() => makeCurledPlane(0.9, 1.9, 0.08), [])
  const mats = useMemo(
    () => pool.map((map) => new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.92, transparent: true, opacity: 0 })),
    [pool],
  )
  const label = useMemo(() => {
    const s = makeLabelSprite('Thank you for living', { size: 42, sub: 'every receipt remembers' })
    ;(s.material as THREE.SpriteMaterial).depthTest = false
    s.renderOrder = 10
    return s
  }, [])
  const slots = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const f = i / COUNT
        return { a: f * Math.PI * 6, y: f * HEIGHT, tex: i % pool.length }
      }),
    [pool.length],
  )
  useEffect(() => () => {
    geo.dispose()
    mats.forEach((m) => m.dispose())
    ;(label.material as THREE.SpriteMaterial).map?.dispose()
  }, [geo, mats, label])

  useFrame((state, dt) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const w = world.w.end
    const target = Math.max(0, (w - 0.05) / 0.95)
    mats.forEach((m) => (m.opacity += (target - m.opacity) * ease(dt, 3)))
    ;(label.material as THREE.SpriteMaterial).opacity = mats[0].opacity
    if (light.current) light.current.intensity = 120 * mats[0].opacity
    group.current.visible = mats[0].opacity > 0.02
    if (!group.current.visible) return
    group.current.rotation.y = t * 0.12
    const rise = target // the spiral assembles as the credits roll in
    slots.forEach((s, i) => {
      const m = meshes.current[i]
      if (!m) return
      const a = s.a + Math.sin(t * 0.3 + i) * 0.05
      m.position.set(Math.cos(a) * RADIUS, s.y * rise + Math.sin(t * 0.8 + i) * 0.05, Math.sin(a) * RADIUS)
      m.rotation.set(0, -a + Math.PI / 2, Math.sin(t * 0.5 + i) * 0.08)
    })
    label.position.set(0, HEIGHT * rise + 0.7, 0)
  })

  return (
    <group ref={group} position={HELIX_POS}>
      {slots.map((s, i) => (
        <mesh key={i} ref={(el) => el && (meshes.current[i] = el)} geometry={geo} material={mats[s.tex]} />
      ))}
      <primitive object={label} />
      <pointLight ref={light} position={[0, HEIGHT * 0.5, 3.2]} intensity={0} color="#ffcf82" decay={1.8} distance={16} />
    </group>
  )
}
