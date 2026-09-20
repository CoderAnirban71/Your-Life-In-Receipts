import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { chapters, threads, transactions, txById } from '../../lib/data'
import { fmtMonth, inr } from '../../lib/format'
import { world } from '../../lib/world'
import { makeCurledPlane, makeReceiptTexture, type PaperLine } from './paperTexture'

/* ------------------------------------------------------------------ helpers */

/** Tiny seeded PRNG so the world is identical on every load. */
function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** frame-rate independent lerp factor */
const ease = (dt: number, speed = 6) => 1 - Math.exp(-Math.min(dt, 0.1) * speed)

/* ------------------------------------------------------------------ act I · drifting receipts */

const SHEETS = 26
const POOL = 9

function buildPool(): THREE.CanvasTexture[] {
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

function Sheets() {
  const group = useRef<THREE.Group>(null)
  const meshes = useRef<THREE.Mesh[]>([])
  const pool = useMemo(() => buildPool(), [])
  const geo = useMemo(() => makeCurledPlane(1, 2.1, 0.09), [])
  const mats = useMemo(
    () => pool.map((map) => new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide, roughness: 0.92, transparent: true })),
    [pool],
  )
  const sheets = useMemo<Sheet[]>(() => {
    const rnd = mulberry32(7)
    return Array.from({ length: SHEETS }, (_, i) => ({
      pos: new THREE.Vector3((rnd() - 0.5) * 16, (rnd() - 0.5) * 12, -2 - rnd() * 7),
      rot: new THREE.Euler((rnd() - 0.5) * 0.8, (rnd() - 0.5) * 1.4, (rnd() - 0.5) * 0.6),
      speed: 0.12 + rnd() * 0.22,
      spin: (rnd() - 0.5) * 0.25,
      phase: rnd() * Math.PI * 2,
      tex: i % POOL,
      scale: 0.75 + rnd() * 0.7,
    }))
  }, [])
  useEffect(() => () => {
    geo.dispose()
    mats.forEach((m) => m.dispose())
    pool.forEach((t) => t.dispose())
  }, [geo, mats, pool])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const d = Math.min(dt, 0.05)
    // paper is the hero in act I, a quiet backdrop in II/III, almost gone behind the ring
    const target = 1 - 0.55 * Math.max(world.w.river, world.w.threads) - 0.9 * world.w.roll
    const k = ease(dt)
    mats.forEach((m) => (m.opacity += (target - m.opacity) * k))
    sheets.forEach((s, i) => {
      const m = meshes.current[i]
      if (!m) return
      s.pos.y += s.speed * d
      if (s.pos.y > 7) s.pos.y = -7
      m.position.set(s.pos.x + Math.sin(t * 0.4 + s.phase) * 0.25, s.pos.y, s.pos.z)
      m.rotation.set(s.rot.x + Math.sin(t * 0.3 + s.phase) * 0.15, s.rot.y + t * s.spin, s.rot.z + Math.cos(t * 0.25 + s.phase) * 0.1)
    })
    if (group.current) {
      group.current.rotation.y += (world.px * 0.18 - group.current.rotation.y) * 0.04
      group.current.rotation.x += (-world.py * 0.12 - group.current.rotation.x) * 0.04
      // the whole field slides up as the page scrolls: the room moves, the reader stays
      group.current.position.y = (world.scroll / window.innerHeight) * 0.9
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

function Dust() {
  const ref = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const n = 420
    const arr = new Float32Array(n * 3)
    const rnd = mulberry32(3)
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (rnd() - 0.5) * 20
      arr[i * 3 + 1] = (rnd() - 0.5) * 16
      arr[i * 3 + 2] = -2 - rnd() * 8
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [])
  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = state.clock.elapsedTime * 0.012
    ref.current.position.y = (world.scroll / window.innerHeight) * 0.5
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#f5b74a" size={0.035} transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  )
}

/* ------------------------------------------------------------------ act II · the paper river */

const RIB_W = 34
const RIB_H = 6
const RIB_SX = 160
const RIB_SY = 18

/**
 * A glowing ribbon that flows behind the River chart: amber above the waterline,
 * teal below it — the same rule as the chart itself. Waves are displaced on the CPU
 * (3k vertices) and the colour lives in the vertex buffer, so it needs no custom shader.
 */
function Ribbon() {
  const mesh = useRef<THREE.Mesh>(null)
  const { geo, alphaMap } = useMemo(() => {
    const g = new THREE.PlaneGeometry(RIB_W, RIB_H, RIB_SX, RIB_SY)
    const pos = g.attributes.position as THREE.BufferAttribute
    const col = new Float32Array(pos.count * 3)
    const amber = new THREE.Color('#f5b74a')
    const teal = new THREE.Color('#4fd1c5')
    const tmp = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const v = pos.getY(i) / RIB_H + 0.5 // 0 bottom .. 1 top
      tmp.copy(teal).lerp(amber, THREE.MathUtils.smoothstep(v, 0.42, 0.58))
      const glow = 0.55 + 0.9 * Math.exp(-Math.pow((v - 0.5) * 7, 2))
      col[i * 3] = tmp.r * glow
      col[i * 3 + 1] = tmp.g * glow
      col[i * 3 + 2] = tmp.b * glow
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    // soft edges: an alpha map that fades to black at the borders
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 64
    const ctx = c.getContext('2d')!
    const gx = ctx.createLinearGradient(0, 0, 256, 0)
    gx.addColorStop(0, '#000')
    gx.addColorStop(0.12, '#fff')
    gx.addColorStop(0.88, '#fff')
    gx.addColorStop(1, '#000')
    ctx.fillStyle = gx
    ctx.fillRect(0, 0, 256, 64)
    const gy = ctx.createLinearGradient(0, 0, 0, 64)
    gy.addColorStop(0, 'rgba(0,0,0,1)')
    gy.addColorStop(0.25, 'rgba(0,0,0,0)')
    gy.addColorStop(0.75, 'rgba(0,0,0,0)')
    gy.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = gy
    ctx.fillRect(0, 0, 256, 64)
    const t = new THREE.CanvasTexture(c)
    return { geo: g, alphaMap: t }
  }, [])
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        alphaMap,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    [alphaMap],
  )
  useEffect(() => () => {
    geo.dispose()
    mat.dispose()
    alphaMap.dispose()
  }, [geo, mat, alphaMap])

  useFrame((state, dt) => {
    if (!mesh.current) return
    const target = world.w.river * 0.55
    mat.opacity += (target - mat.opacity) * ease(dt, 4)
    mesh.current.visible = mat.opacity > 0.02
    if (!mesh.current.visible) return
    const t = state.clock.elapsedTime
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      pos.setZ(i, Math.sin(x * 0.55 + t * 0.9) * 0.45 + Math.sin(x * 1.7 - t * 1.2) * 0.14 + Math.sin(y * 2.2 + t * 0.7) * 0.08)
    }
    pos.needsUpdate = true
  })

  return <mesh ref={mesh} geometry={geo} material={mat} position={[0, 0.3, -3.5]} rotation={[-0.55, 0, 0]} />
}

/* ------------------------------------------------------------------ act III · the constellation */

const KIND_COLOR: Record<string, string> = {
  money: '#f5b74a',
  silence: '#e9e2d3',
  music: '#4fd1c5',
  night: '#a78bfa',
  health: '#fb7185',
  family: '#f472b6',
}

function Constellation() {
  const group = useRef<THREE.Group>(null)
  const pts = useRef<THREE.Points>(null)
  const lines = useRef<THREE.LineSegments>(null)
  const { pointGeo, lineGeo } = useMemo(() => {
    const rnd = mulberry32(11)
    const pos: number[] = []
    const col: number[] = []
    const lpos: number[] = []
    const lcol: number[] = []
    const N = threads.length
    threads.forEach((th, i) => {
      const a = (i / N) * Math.PI * 2
      const cx = Math.cos(a) * 2.6
      const cy = Math.sin(a) * 1.6
      const cz = (rnd() - 0.5) * 2
      const c = new THREE.Color(KIND_COLOR[th.kind] ?? '#f5b74a')
      // the thread's hub
      pos.push(cx, cy, cz)
      col.push(c.r, c.g, c.b)
      let prev: [number, number, number] = [cx, cy, cz]
      th.evidence.forEach((id) => {
        const t = txById.get(id)
        if (!t) return
        const r = 0.5 + Math.log10(1 + t.amt) * 0.12
        const p: [number, number, number] = [cx + (rnd() - 0.5) * r * 2, cy + (rnd() - 0.5) * r * 1.4, cz + (rnd() - 0.5) * r * 2]
        pos.push(...p)
        col.push(c.r, c.g, c.b)
        lpos.push(...prev, ...p)
        lcol.push(c.r, c.g, c.b, c.r, c.g, c.b)
        prev = p
      })
    })
    const pg = new THREE.BufferGeometry()
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3))
    lg.setAttribute('color', new THREE.Float32BufferAttribute(lcol, 3))
    return { pointGeo: pg, lineGeo: lg }
  }, [])

  useFrame((state, dt) => {
    if (!group.current || !pts.current || !lines.current) return
    const target = world.w.threads
    const pm = pts.current.material as THREE.PointsMaterial
    const lm = lines.current.material as THREE.LineBasicMaterial
    pm.opacity += (target * 0.95 - pm.opacity) * ease(dt, 4)
    lm.opacity += (target * 0.45 - lm.opacity) * ease(dt, 4)
    group.current.visible = pm.opacity > 0.02
    group.current.rotation.y = state.clock.elapsedTime * 0.06 + world.px * 0.25
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.12 - world.py * 0.15
  })

  return (
    <group ref={group} position={[0, 0.2, -3.2]}>
      <points ref={pts} geometry={pointGeo}>
        <pointsMaterial vertexColors size={0.11} transparent opacity={0} sizeAttenuation depthWrite={false} />
      </points>
      <lineSegments ref={lines} geometry={lineGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

/* ------------------------------------------------------------------ act IV · the chapter ring */

const N = chapters.length
const STEP = (Math.PI * 2) / N
const RADIUS = 3.6

function chapterTexture(i: number) {
  const c = chapters[i]
  const lines: PaperLine[] = [
    { left: c.title, bold: true, center: true },
    { left: `${fmtMonth(c.range[0])} → ${fmtMonth(c.range[1])}`, muted: true, center: true },
    { rule: true, left: '' },
    { left: 'SPENT', right: inr(c.spend, true), bold: true },
    { left: 'RECEIVED', right: `+${inr(c.income, true)}`, muted: true },
    { left: 'RECEIPTS', right: String(c.receipts) },
    { left: 'SONGS', right: c.plays.toLocaleString('en-IN') },
    { left: 'HOURS OF MUSIC', right: String(c.hours) },
    { rule: true, left: '' },
    { left: 'WHERE IT WENT', muted: true },
    ...c.topCats.slice(0, 4).map((k) => ({ left: k.g.toUpperCase(), right: inr(k.amt, true) })),
    { rule: true, left: '' },
    { left: 'SOUNDTRACK', muted: true },
    ...c.artists.slice(0, 3).map((a) => ({ left: `♪ ${a.artist}`, right: `${a.min}m` })),
    ...(c.track ? [{ left: `★ ${c.track.track}`.slice(0, 26), right: `${c.track.plays}×`, bold: true }] : []),
    { rule: true, left: '' },
    { left: 'THANK YOU FOR LIVING', center: true, muted: true },
  ]
  return makeReceiptTexture(lines, { title: `Chapter ${c.n}`, w: 512, h: 1024, scale: 2 })
}

function ringActive(): number {
  return Math.min(N - 1, Math.max(0, Math.round(world.ring * (N - 1))))
}

function Ring({ onPick }: { onPick: (i: number) => void }) {
  const group = useRef<THREE.Group>(null)
  const meshes = useRef<THREE.Mesh[]>([])
  const { size } = useThree()
  const texs = useMemo(() => chapters.map((_, i) => chapterTexture(i)), [])
  const geo = useMemo(() => makeCurledPlane(1.45, 2.9, 0.07), [])
  const mats = useMemo(() => texs.map((map) => new THREE.MeshStandardMaterial({ map, side: THREE.FrontSide, roughness: 0.9, transparent: true })), [texs])
  // plain paper for the back of every card; created once, mutated only inside useFrame
  const [back] = useState(() => new THREE.MeshStandardMaterial({ color: '#e9e2d3', side: THREE.BackSide, roughness: 0.95, transparent: true }))
  useEffect(() => () => {
    geo.dispose()
    back.dispose()
    mats.forEach((m) => m.dispose())
    texs.forEach((t) => t.dispose())
  }, [geo, mats, texs, back])

  useFrame((state, dt) => {
    if (!group.current) return
    const k = ease(dt, 7)
    const w = world.w.roll
    const target = -world.ring * STEP * (N - 1)
    group.current.rotation.y += (target - group.current.rotation.y) * k
    // desktop: the ring sits to the right so the chapter panel can sit on the left
    const xOff = size.width >= 1280 ? 2.3 : size.width >= 1024 ? 1.9 : 0
    // phones: the panel sits at the bottom, so lift the ring and let the card peek above it
    const yOff = size.width < 1024 ? 1.15 : 0
    group.current.position.x += (xOff - group.current.position.x) * k
    group.current.position.y = yOff + Math.sin(state.clock.elapsedTime * 0.6) * 0.05 - (1 - w) * 1.5
    const op = Math.max(0, (w - 0.15) / 0.85)
    mats.forEach((m) => (m.opacity += (op - m.opacity) * k))
    back.opacity = mats[0].opacity
    group.current.visible = mats[0].opacity > 0.02
    const active = ringActive()
    meshes.current.forEach((m, i) => {
      if (!m) return
      const want = i === active ? 1.12 : 0.92
      m.scale.setScalar(m.scale.x + (want - m.scale.x) * k)
      m.position.y = Math.sin(state.clock.elapsedTime * 0.8 + i) * 0.04
    })
  })

  return (
    <group ref={group} position={[0, 0, -RADIUS]}>
      {chapters.map((c, i) => {
        const a = i * STEP
        return (
          <mesh
            key={c.n}
            ref={(el) => el && (meshes.current[i] = el)}
            geometry={geo}
            material={mats[i]}
            position={[Math.sin(a) * RADIUS, 0, Math.cos(a) * RADIUS]}
            rotation={[0, a, 0]}
            onClick={(e) => {
              e.stopPropagation()
              onPick(i)
            }}
            onPointerOver={() => (document.body.style.cursor = 'pointer')}
            onPointerOut={() => (document.body.style.cursor = '')}
          >
            <mesh geometry={geo} material={back} />
          </mesh>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ lights + camera */

const KEY: Record<string, THREE.Color> = {
  hook: new THREE.Color('#f5b74a'),
  river: new THREE.Color('#ffd27a'),
  threads: new THREE.Color('#a78bfa'),
  roll: new THREE.Color('#f5b74a'),
}
const FILL: Record<string, THREE.Color> = {
  hook: new THREE.Color('#4fd1c5'),
  river: new THREE.Color('#4fd1c5'),
  threads: new THREE.Color('#fb7185'),
  roll: new THREE.Color('#4fd1c5'),
}

const scratchColor = new THREE.Color() // scratch value reused every frame

function Lights() {
  const key = useRef<THREE.PointLight>(null)
  const fill = useRef<THREE.PointLight>(null)
  useFrame((_, dt) => {
    if (!key.current || !fill.current) return
    const tmp = scratchColor
    const k = ease(dt, 3)
    const ids = ['hook', 'river', 'threads', 'roll'] as const
    let sum = 0
    tmp.setRGB(0, 0, 0)
    for (const id of ids) {
      const w = world.w[id]
      sum += w
      tmp.r += KEY[id].r * w
      tmp.g += KEY[id].g * w
      tmp.b += KEY[id].b * w
    }
    if (sum > 0) tmp.multiplyScalar(1 / sum)
    key.current.color.lerp(tmp, k)
    tmp.setRGB(0, 0, 0)
    for (const id of ids) {
      const w = world.w[id] / (sum || 1)
      tmp.r += FILL[id].r * w
      tmp.g += FILL[id].g * w
      tmp.b += FILL[id].b * w
    }
    fill.current.color.lerp(tmp, k)
    key.current.intensity += ((world.w.roll > 0.5 ? 150 : 70) - key.current.intensity) * k
  })
  return (
    <>
      <ambientLight intensity={0.38} />
      <pointLight ref={key} position={[3, 4, 4]} intensity={70} color="#f5b74a" decay={2} />
      <pointLight ref={fill} position={[-5, -3, 1]} intensity={20} color="#4fd1c5" decay={2} />
    </>
  )
}

function Rig() {
  const { camera, size } = useThree()
  useEffect(() => {
    camera.position.set(0, 0, size.width < 640 ? 9.5 : 7)
    camera.lookAt(0, 0, 0)
  }, [camera, size.width])
  useFrame(() => {
    // a breath of camera drift so the world never feels like a static backdrop
    camera.position.x += (world.px * 0.25 - camera.position.x) * 0.03
    camera.position.y += (-world.py * 0.15 - camera.position.y) * 0.03
    camera.lookAt(0, 0, 0)
  })
  return null
}

/* ------------------------------------------------------------------ the world */

/** One persistent scene behind the whole page. Each act owns one element in it. */
export function World({ onPickChapter }: { onPickChapter: (i: number) => void }) {
  return (
    <Canvas
      frameloop="always"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 40, near: 0.1, far: 40 }}
      style={{ position: 'absolute', inset: 0 }}
      eventSource={document.body}
      eventPrefix="client"
      aria-hidden
    >
      <Rig />
      <fog attach="fog" args={['#0b0a0f', 6, 16]} />
      <Lights />
      <Sheets />
      <Dust />
      <Ribbon />
      <Constellation />
      <Ring onPick={onPickChapter} />
    </Canvas>
  )
}
