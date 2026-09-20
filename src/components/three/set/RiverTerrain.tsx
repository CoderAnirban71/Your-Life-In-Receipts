import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { daily, meta } from '../../../lib/data'
import { useStory } from '../../../lib/store'
import { world } from '../../../lib/world'
import { makeLabelSprite } from '../labelSprite'
import { DESK_Y, ease, gradientAlpha, mulberry32 } from './shared'

const BIN_DAYS = 7
const STEP = 0.1
const BAR_W = 0.074
export const WATER_Y = DESK_Y + 1.35
export const RIVER_Z = -2.6
const MAX_UP = 2.0
const MAX_DOWN = 1.3

interface Bin {
  d0: string
  d1: string
  spend: number
  min: number
}

function bins(): Bin[] {
  const out: Bin[] = []
  for (let i = 0; i < daily.length; i += BIN_DAYS) {
    const s = daily.slice(i, i + BIN_DAYS)
    out.push({ d0: s[0].d, d1: s[s.length - 1].d, spend: s.reduce((a, d) => a + d.spend, 0), min: s.reduce((a, d) => a + d.min, 0) })
  }
  return out
}

export const RIVER_BINS = bins()
export const RIVER_SPAN = RIVER_BINS.length * STEP
export const riverX = (i: number) => -RIVER_SPAN / 2 + i * STEP + STEP / 2

/**
 * The River, as terrain: every week of the ledger is a bar standing on the desk —
 * spending rises above a glowing waterline, listening hangs below it. The brushed
 * range on the 2D chart lights up here too, so the two views are one instrument.
 */
export function RiverTerrain() {
  const up = useRef<THREE.InstancedMesh>(null)
  const down = useRef<THREE.InstancedMesh>(null)
  const group = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Mesh>(null)
  const range = useRef<[string, string]>([meta.window[0], meta.window[1]])
  const dirty = useRef(true)
  const grown = useRef(0)

  const n = RIVER_BINS.length
  const maxSpend = Math.max(...RIVER_BINS.map((b) => b.spend))
  const maxMin = Math.max(...RIVER_BINS.map((b) => b.min))
  const heights = useMemo(
    () => RIVER_BINS.map((b) => ({ up: Math.max(0.02, Math.sqrt(b.spend / maxSpend) * MAX_UP), down: Math.max(0.02, Math.sqrt(b.min / maxMin) * MAX_DOWN) })),
    [maxSpend, maxMin],
  )

  const geo = useMemo(() => new THREE.BoxGeometry(BAR_W, 1, BAR_W), [])
  const matUp = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, emissive: '#f97316', emissiveIntensity: 0.12, transparent: true, opacity: 0 }), [])
  const matDown = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1, emissive: '#2fb3a8', emissiveIntensity: 0.14, transparent: true, opacity: 0 }), [])
  const glowAlpha = useMemo(() => gradientAlpha([[0, 0], [0.5, 1], [1, 0]]), [])
  const labels = useMemo(() => {
    const out: { sprite: THREE.Sprite; x: number }[] = []
    for (let i = 0; i < n; i++) {
      const y = RIVER_BINS[i].d0.slice(0, 4)
      if (RIVER_BINS[i].d0.slice(5, 7) === '01' && (i === 0 || RIVER_BINS[i - 1].d0.slice(0, 4) !== y)) {
        out.push({ sprite: makeLabelSprite(y, { mono: true, size: 30, color: '#f5b74a' }), x: riverX(i) })
      }
    }
    return out
  }, [n])
  const sparks = useMemo(() => {
    const rnd = mulberry32(21)
    const arr = new Float32Array(160 * 3)
    for (let i = 0; i < 160; i++) {
      arr[i * 3] = (rnd() - 0.5) * RIVER_SPAN
      arr[i * 3 + 1] = WATER_Y + (rnd() - 0.5) * 0.6
      arr[i * 3 + 2] = RIVER_Z + (rnd() - 0.5) * 1.5
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [])

  useEffect(() => {
    // the 2D brush and this terrain share one range
    return useStory.subscribe((s) => {
      if (s.range[0] !== range.current[0] || s.range[1] !== range.current[1]) {
        range.current = s.range
        dirty.current = true
      }
    })
  }, [])
  useEffect(() => () => {
    geo.dispose()
    matUp.dispose()
    matDown.dispose()
    glowAlpha.dispose()
    labels.forEach((l) => (l.sprite.material as THREE.SpriteMaterial).map?.dispose())
  }, [geo, matUp, matDown, glowAlpha, labels])

  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const c = useMemo(() => new THREE.Color(), [])

  useFrame((state, dt) => {
    if (!up.current || !down.current || !group.current) return
    const t = state.clock.elapsedTime
    const w = world.w.river
    // full presence while the chart is read; it recedes once the receipt feed takes over
    const reading = Math.min(1, Math.max(0, (world.p.river - 0.35) / 0.3))
    const target = Math.max(0, (w - 0.05) / 0.95) * (1 - 0.6 * reading)
    matUp.opacity += (target - matUp.opacity) * ease(dt, 4)
    matDown.opacity = matUp.opacity
    group.current.visible = matUp.opacity > 0.02
    if (!group.current.visible) return
    // bars grow out of the waterline the first time the river appears
    grown.current += (target - grown.current) * ease(dt, 2.2)
    const g = grown.current
    for (let i = 0; i < n; i++) {
      const x = riverX(i)
      const ripple = 1 + Math.sin(t * 1.6 + i * 0.35) * 0.03
      const hu = heights[i].up * g * ripple
      const hd = heights[i].down * g * ripple
      m4.makeScale(1, hu, 1).setPosition(x, WATER_Y + hu / 2 + 0.01, RIVER_Z)
      up.current.setMatrixAt(i, m4)
      m4.makeScale(1, hd, 1).setPosition(x, WATER_Y - hd / 2 - 0.01, RIVER_Z)
      down.current.setMatrixAt(i, m4)
    }
    up.current.instanceMatrix.needsUpdate = true
    down.current.instanceMatrix.needsUpdate = true
    if (dirty.current) {
      const [a, b] = range.current
      const full = a === meta.window[0] && b === meta.window[1]
      for (let i = 0; i < n; i++) {
        const inside = full || (RIVER_BINS[i].d1 >= a && RIVER_BINS[i].d0 <= b)
        const dim = inside ? 1 : 0.28
        c.set('#f5b74a').lerp(new THREE.Color('#f97316'), heights[i].up / MAX_UP).multiplyScalar(dim)
        up.current.setColorAt(i, c)
        c.set('#4fd1c5').lerp(new THREE.Color('#1f7a74'), heights[i].down / MAX_DOWN).multiplyScalar(dim)
        down.current.setColorAt(i, c)
      }
      up.current.instanceColor!.needsUpdate = true
      down.current.instanceColor!.needsUpdate = true
      dirty.current = false
    }
    if (glow.current) (glow.current.material as THREE.MeshBasicMaterial).opacity = matUp.opacity * 0.55
    labels.forEach((l) => ((l.sprite.material as THREE.SpriteMaterial).opacity = matUp.opacity * 0.9))
  })

  return (
    <group ref={group}>
      <instancedMesh ref={up} args={[geo, matUp, n]} frustumCulled={false} />
      <instancedMesh ref={down} args={[geo, matDown, n]} frustumCulled={false} />
      {/* the waterline */}
      <mesh position={[0, WATER_Y, RIVER_Z]}>
        <boxGeometry args={[RIVER_SPAN + 0.6, 0.012, 0.16]} />
        <meshStandardMaterial color="#f4efe4" emissive="#f4efe4" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* a soft glow behind the terrain */}
      <mesh ref={glow} position={[0, WATER_Y, RIVER_Z - 1.6]}>
        <planeGeometry args={[RIVER_SPAN + 6, 4.5]} />
        <meshBasicMaterial color="#f5b74a" alphaMap={glowAlpha} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <points geometry={sparks}>
        <pointsMaterial color="#ffe9b3" size={0.05} transparent opacity={0.8} sizeAttenuation depthWrite={false} toneMapped={false} />
      </points>
      {labels.map((l, i) => (
        <primitive key={i} object={l.sprite} position={[l.x, WATER_Y + MAX_UP + 0.5, RIVER_Z]} />
      ))}
    </group>
  )
}
