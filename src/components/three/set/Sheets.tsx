import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { transactions } from '../../../lib/data'
import { inr } from '../../../lib/format'
import { world } from '../../../lib/world'
import { makeCurledPlane, makeReceiptTexture, type PaperLine } from '../paperTexture'
import { ease, mulberry32 } from './shared'

const POOL = 9

/** Build a small pool of receipt textures from real ledger lines (consecutive rows of one day). */
export function buildReceiptPool(): THREE.CanvasTexture[] {
  const out: THREE.CanvasTexture[] = []
  const step = Math.floor(transactions.length / POOL)
  for (let p = 0; p < POOL; p++) {
    const rows = transactions.slice(p * step + 7, p * step + 16)
    const lines: PaperLine[] = rows.map((t) => ({ left: (t.note || t.sub || t.cat).slice(0, 22), right: inr(t.amt, true) }))
    const total = rows.filter((t) => t.kind === 'expense').reduce((s, t) => s + t.amt, 0)
    lines.push({ rule: true, left: '' }, { left: 'TOTAL', right: inr(total, true), bold: true }, { rule: true, left: '' }, { left: 'THANK YOU', center: true, muted: true })
    out.push(makeReceiptTexture(lines, { title: rows[0]?.d.slice(0, 7) ?? 'receipt' }))
  }
  return out
}

interface Sheet {
  pos: THREE.Vector3
  rot: THREE.Euler
  speed: number
  spin: number
  phase: number
  tex: number
  scale: number
}

/** Memories in the air: receipts drifting up through the lamp light, all four years of them. */
export function Sheets({ pool }: { pool: THREE.CanvasTexture[] }) {
  const { size } = useThree()
  const count = size.width < 640 ? 14 : 28
  const group = useRef<THREE.Group>(null)
  const meshes = useRef<THREE.Mesh[]>([])
  const geo = useMemo(() => makeCurledPlane(1, 2.1, 0.09), [])
  const mats = useMemo(
    () => pool.map((map) => new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.92, transparent: true })),
    [pool],
  )
  const sheets = useMemo<Sheet[]>(() => {
    const rnd = mulberry32(7)
    return Array.from({ length: count }, (_, i) => ({
      pos: new THREE.Vector3((rnd() - 0.5) * 22, -1 + rnd() * 11, -3.5 - rnd() * 8),
      rot: new THREE.Euler((rnd() - 0.5) * 0.8, (rnd() - 0.5) * 1.4, (rnd() - 0.5) * 0.6),
      speed: 0.1 + rnd() * 0.2,
      spin: (rnd() - 0.5) * 0.25,
      phase: rnd() * Math.PI * 2,
      tex: i % pool.length,
      scale: 0.7 + rnd() * 0.7,
    }))
  }, [count, pool.length])
  useEffect(() => () => {
    geo.dispose()
    mats.forEach((m) => m.dispose())
  }, [geo, mats])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    // the hero of act I; a quiet backdrop in II/III; gone behind the ring; back for the credits
    const want = 0.95 - 0.6 * Math.max(world.w.river, world.w.threads) - 0.95 * world.w.roll + 0.4 * world.w.end
    const target = Math.max(0, Math.min(1, want))
    const k = ease(dt)
    mats.forEach((m) => (m.opacity += (target - m.opacity) * k))
    sheets.forEach((s, i) => {
      const m = meshes.current[i]
      if (!m) return
      s.pos.y += s.speed * d
      if (s.pos.y > 10) s.pos.y = -1
      m.position.set(s.pos.x + Math.sin(t * 0.4 + s.phase) * 0.25, s.pos.y, s.pos.z)
      m.rotation.set(s.rot.x + Math.sin(t * 0.3 + s.phase) * 0.15, s.rot.y + t * s.spin, s.rot.z + Math.cos(t * 0.25 + s.phase) * 0.1)
    })
    if (group.current) {
      group.current.rotation.y += (world.px * 0.08 - group.current.rotation.y) * 0.03
      // the field slides up as the page scrolls: the room moves, the reader stays
      group.current.position.y = (world.scroll / window.innerHeight) * 0.7
      group.current.visible = target > 0.03
    }
  })

  return (
    <group ref={group}>
      {sheets.map((s, i) => (
        <mesh key={i} ref={(el) => el && (meshes.current[i] = el)} geometry={geo} material={mats[s.tex]} scale={s.scale} position={s.pos} rotation={s.rot} />
      ))}
    </group>
  )
}

/** Dust in the lamp light. */
export function Dust() {
  const ref = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const n = 500
    const arr = new Float32Array(n * 3)
    const rnd = mulberry32(3)
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (rnd() - 0.5) * 24
      arr[i * 3 + 1] = -2 + rnd() * 14
      arr[i * 3 + 2] = -1 - rnd() * 10
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [])
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = state.clock.elapsedTime * 0.012
    ref.current.position.y = (world.scroll / window.innerHeight) * 0.4
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#ffd27a" size={0.04} transparent opacity={0.55} sizeAttenuation depthWrite={false} toneMapped={false} />
    </points>
  )
}
