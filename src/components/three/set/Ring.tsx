import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { chapters } from '../../../lib/data'
import { fmtMonth, inr } from '../../../lib/format'
import { sound } from '../../../lib/sound'
import { world } from '../../../lib/world'
import { makeCurledPlane, makeReceiptTexture, type PaperLine } from '../paperTexture'
import { DESK_Y, ease, gradientAlpha } from './shared'

const N = chapters.length
const STEP = (Math.PI * 2) / N
export const RING_RADIUS = 3.6
const CARD_H = 2.9
export const RING_Y = DESK_Y + (CARD_H * 1.12) / 2 + 0.05
export const RING_Z = -RING_RADIUS
export const ringX = (width: number) => (width >= 1280 ? 2.3 : width >= 1024 ? 1.9 : 0)

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

const ringActive = () => Math.min(N - 1, Math.max(0, Math.round(world.ring * (N - 1))))

/**
 * The seven chapters standing in a ring on the desk. Scroll turns it; the chapter
 * facing the camera steps forward under its own spotlight.
 */
export function Ring({ onPick }: { onPick: (i: number) => void }) {
  const group = useRef<THREE.Group>(null)
  const meshes = useRef<THREE.Mesh[]>([])
  const beam = useRef<THREE.Mesh>(null)
  const beamLight = useRef<THREE.SpotLight>(null)
  const lastActive = useRef(-1)
  const { size } = useThree()
  const texs = useMemo(() => chapters.map((_, i) => chapterTexture(i)), [])
  const geo = useMemo(() => makeCurledPlane(1.45, CARD_H, 0.07), [])
  const mats = useMemo(() => texs.map((map) => new THREE.MeshStandardMaterial({ map, side: THREE.FrontSide, roughness: 0.9, transparent: true })), [texs])
  const [back] = useState(() => new THREE.MeshStandardMaterial({ color: '#e9e2d3', side: THREE.BackSide, roughness: 0.95, transparent: true }))
  const beamAlpha = useMemo(() => gradientAlpha([[0, 0.9], [1, 0]]), [])
  const beamTarget = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0, DESK_Y, RING_RADIUS)
    return o
  }, [])
  useEffect(() => () => {
    geo.dispose()
    back.dispose()
    beamAlpha.dispose()
    mats.forEach((m) => m.dispose())
    texs.forEach((t) => t.dispose())
  }, [geo, mats, texs, back, beamAlpha])

  useFrame((state, dt) => {
    if (!group.current) return
    const k = ease(dt, 7)
    const w = world.w.roll
    const t = state.clock.elapsedTime
    group.current.rotation.y += (-world.ring * STEP * (N - 1) - group.current.rotation.y) * k
    const xOff = ringX(size.width)
    group.current.position.x += (xOff - group.current.position.x) * k
    // rises from under the desk as the act arrives
    group.current.position.y = RING_Y - (1 - w) * 3.2
    const op = Math.max(0, (w - 0.15) / 0.85)
    mats.forEach((m) => (m.opacity += (op - m.opacity) * k))
    back.opacity = mats[0].opacity
    group.current.visible = mats[0].opacity > 0.02
    const active = ringActive()
    if (active !== lastActive.current) {
      if (lastActive.current >= 0 && w > 0.5) sound.chime(active)
      lastActive.current = active
    }
    meshes.current.forEach((m, i) => {
      if (!m) return
      const want = i === active ? 1.12 : 0.92
      m.scale.setScalar(m.scale.x + (want - m.scale.x) * k)
      m.position.y = Math.sin(t * 0.8 + i) * 0.03
    })
    if (beam.current) {
      const bm = beam.current.material as THREE.MeshBasicMaterial
      bm.opacity = op * (0.16 + Math.sin(t * 1.3) * 0.02)
      beam.current.position.x = group.current.position.x
      beam.current.position.y = group.current.position.y + 2.6
    }
    if (beamLight.current) {
      beamLight.current.intensity = 150 * op
      beamLight.current.position.set(group.current.position.x, group.current.position.y + 4.2, 1.2)
      beamTarget.position.set(group.current.position.x, DESK_Y, 0)
    }
  })

  return (
    <>
      <group ref={group} position={[ringX(size.width), RING_Y, RING_Z]}>
        {chapters.map((c, i) => {
          const a = i * STEP
          return (
            <mesh
              key={c.n}
              ref={(el) => el && (meshes.current[i] = el)}
              geometry={geo}
              material={mats[i]}
              position={[Math.sin(a) * RING_RADIUS, 0, Math.cos(a) * RING_RADIUS]}
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
      {/* the spotlight on whichever chapter is facing you */}
      <primitive object={beamTarget} />
      <spotLight ref={beamLight} target={beamTarget} angle={0.5} penumbra={0.8} intensity={0} color="#fff1cf" decay={1.8} distance={12} />
      <mesh ref={beam} position={[0, RING_Y + 2.6, 0.1]}>
        <coneGeometry args={[1.7, 5.2, 40, 1, true]} />
        <meshBasicMaterial color="#ffd89a" alphaMap={beamAlpha} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}
