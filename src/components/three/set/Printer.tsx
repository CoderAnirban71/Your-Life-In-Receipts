import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { meta } from '../../../lib/data'
import { fmtDay, inr } from '../../../lib/format'
import { sound } from '../../../lib/sound'
import { world } from '../../../lib/world'
import { makeCurledPlane, makeReceiptTexture, type PaperLine } from '../paperTexture'
import { DESK_Y, ease } from './shared'

const RECEIPT_W = 1.7
const RECEIPT_H = 2.42 // matches the painted texture's aspect (256 x 364)
const PRINT_SECONDS = 7.5

/** The story's summary, printed line by line — the same fourteen lines the DOM used to show. */
export const HERO_LINES: PaperLine[] = [
  { left: 'customer', right: 'R.', muted: true },
  { left: 'period', right: `${fmtDay(meta.window[0])} → ${fmtDay(meta.window[1])}`, muted: true },
  { rule: true, left: '' },
  { left: 'RECEIPTS', right: meta.receipts.toLocaleString('en-IN') },
  { left: 'SONGS PLAYED', right: meta.listens.toLocaleString('en-IN') },
  { left: 'HOURS OF MUSIC', right: meta.hours.toLocaleString('en-IN') },
  { left: 'SPENT', right: inr(meta.spend) },
  { left: 'RECEIVED', right: inr(meta.income) },
  { rule: true, left: '' },
  { left: 'WEDDINGS', right: '1' },
  { left: 'ROOT CANALS', right: '1' },
  { left: 'SONGS NEVER FINISHED', right: '84' },
  { left: 'TRANSFERS HOME', right: '41' },
  { rule: true, left: '' },
  { left: 'TOTAL', right: 'ONE LIFE', bold: true },
  { rule: true, left: '' },
  { left: 'KEEP THIS RECEIPT', center: true, muted: true },
]

/**
 * A thermal printer on the desk. On load it prints the hero receipt in real time —
 * the paper rises out of the slot in small feed steps, exactly like the real thing.
 */
export function Printer({ x = 2.5 }: { x?: number }) {
  const { gl, size } = useThree()
  const paper = useRef<THREE.Mesh>(null)
  const led = useRef<THREE.Mesh>(null)
  const group = useRef<THREE.Group>(null)
  const progress = useRef(0)
  const lastTick = useRef(0)

  const posX = size.width < 640 ? 0 : x
  const slotY = DESK_Y + 0.46

  const tex = useMemo(() => makeReceiptTexture(HERO_LINES, { title: 'Every Receipt Remembers', w: 512, h: 728, scale: 2 }), [])
  const geo = useMemo(() => makeCurledPlane(RECEIPT_W, RECEIPT_H, 0.05), [])
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -slotY), [slotY])
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.92, clippingPlanes: [clip], clipShadows: true }),
    [tex, clip],
  )
  const backMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e9e2d3', side: THREE.BackSide, roughness: 0.95, clippingPlanes: [clip] }), [clip])

  useEffect(() => {
    gl.localClippingEnabled = true
  }, [gl])
  useEffect(() => () => {
    tex.dispose()
    geo.dispose()
    mat.dispose()
    backMat.dispose()
  }, [tex, geo, mat, backMat])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    // start printing a beat after the world appears; feed in quantised steps
    const raw = Math.min(1, Math.max(0, (t - 1.1) / PRINT_SECONDS))
    const stepped = Math.floor(raw * 46) / 46
    if (stepped > progress.current) {
      progress.current = stepped
      if (t - lastTick.current > 0.05) {
        sound.tick()
        lastTick.current = t
      }
    }
    const p = progress.current
    if (paper.current) {
      paper.current.position.y = slotY + RECEIPT_H * (p - 0.5) + 0.02
      // once printed, the paper sways in the lamp's warmth
      paper.current.rotation.x = -0.06 + Math.sin(t * 0.7) * 0.015 * p
      paper.current.rotation.y = Math.sin(t * 0.45) * 0.03 * p
    }
    if (led.current) {
      const m = led.current.material as THREE.MeshStandardMaterial
      const printing = p < 1
      m.emissiveIntensity = printing ? 2 + Math.sin(t * 24) * 2 : 1.2 + Math.sin(t * 1.5) * 0.6
      m.emissive.set(printing ? '#ff6a2a' : '#4fd1c5')
    }
    if (group.current) {
      // the printer belongs to act I; it sinks under the desk once the story moves on
      const want = (1 - world.w.hook) * -4.5
      group.current.position.y += (want - group.current.position.y) * ease(dt, 3)
      group.current.visible = group.current.position.y > -4.3
      group.current.position.x += (posX - group.current.position.x) * ease(dt, 3)
    }
  })

  return (
    <group ref={group} position={[posX, 0, 0]}>
      {/* body */}
      <mesh position={[0, DESK_Y + 0.225, 0]}>
        <boxGeometry args={[2.1, 0.45, 1.15]} />
        <meshStandardMaterial color="#1a1720" roughness={0.55} metalness={0.25} />
      </mesh>
      {/* lid with a slot */}
      <mesh position={[0, DESK_Y + 0.455, 0]}>
        <boxGeometry args={[2.0, 0.02, 1.05]} />
        <meshStandardMaterial color="#25212c" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, DESK_Y + 0.468, 0.02]}>
        <boxGeometry args={[1.64, 0.012, 0.09]} />
        <meshStandardMaterial color="#050407" roughness={1} />
      </mesh>
      {/* status LED */}
      <mesh ref={led} position={[0.86, DESK_Y + 0.47, 0.42]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial color="#ffb28a" emissive="#ff6a2a" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      {/* a little warm light so the fresh print reads, even from the far side of the lamp */}
      <pointLight position={[0.7, DESK_Y + 2.3, 1.8]} intensity={7} color="#ffd9a3" decay={2} distance={6} />
      {/* the paper */}
      <mesh ref={paper} geometry={geo} material={mat} position={[0, slotY - RECEIPT_H / 2, 0.02]}>
        <mesh geometry={geo} material={backMat} />
      </mesh>
    </group>
  )
}
