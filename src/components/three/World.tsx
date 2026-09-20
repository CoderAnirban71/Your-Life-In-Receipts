import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStory } from '../../lib/store'
import { world } from '../../lib/world'
import { CameraRig } from './set/CameraRig'
import { Constellation } from './set/Constellation'
import { Desk } from './set/Desk'
import { Effects } from './set/Effects'
import { EndHelix } from './set/EndHelix'
import { Lamp } from './set/Lamp'
import { Printer } from './set/Printer'
import { Ring } from './set/Ring'
import { RiverTerrain } from './set/RiverTerrain'
import { buildReceiptPool, Dust, Sheets } from './set/Sheets'
import { ease } from './set/shared'

/** Fill light that changes colour with the act — cool for music, violet for the night threads, warm for the ring. */
const FILL: Record<string, THREE.Color> = {
  hook: new THREE.Color('#ffb36b'),
  river: new THREE.Color('#4fd1c5'),
  threads: new THREE.Color('#a78bfa'),
  roll: new THREE.Color('#f5b74a'),
  end: new THREE.Color('#ffb36b'),
}
const scratch = new THREE.Color()

function MoodLights() {
  const fill = useRef<THREE.PointLight>(null)
  const rim = useRef<THREE.PointLight>(null)
  useFrame((_, dt) => {
    if (!fill.current || !rim.current) return
    const k = ease(dt, 3)
    scratch.setRGB(0, 0, 0)
    let sum = 0
    for (const id of Object.keys(FILL)) {
      const w = world.w[id as keyof typeof world.w]
      if (w <= 0) continue
      sum += w
      scratch.r += FILL[id].r * w
      scratch.g += FILL[id].g * w
      scratch.b += FILL[id].b * w
    }
    if (sum > 0) scratch.multiplyScalar(1 / sum)
    fill.current.color.lerp(scratch, k)
    rim.current.intensity += ((world.w.threads > 0.4 ? 90 : 30) - rim.current.intensity) * k
  })
  return (
    <>
      <ambientLight intensity={0.22} />
      <hemisphereLight args={['#2a2436', '#0b0a0f', 0.35]} />
      <pointLight ref={fill} position={[6, 2, 3]} intensity={18} color="#ffb36b" decay={2} />
      <pointLight ref={rim} position={[0, 4, -9]} intensity={30} color="#a78bfa" decay={2} />
    </>
  )
}

function Pool({ children }: { children: (pool: THREE.CanvasTexture[]) => ReactNode }) {
  const pool = useMemo(() => buildReceiptPool(), [])
  useEffect(() => () => pool.forEach((t) => t.dispose()), [pool])
  return <>{children(pool)}</>
}

/**
 * One persistent scene behind the whole page: a desk at night, a lamp, a printer,
 * the river as terrain, the threads as a constellation, the chapters as a ring,
 * the credits as a spiral. The camera walks the reader through it as they scroll.
 */
export function World({ onPickChapter }: { onPickChapter: (i: number) => void }) {
  const fx = useStory((s) => s.fx)
  const wide = typeof window !== 'undefined' && window.innerWidth >= 768
  return (
    <Canvas
      frameloop="always"
      dpr={[1, fx ? 1.5 : 1.25]}
      gl={{ antialias: !fx, alpha: false, powerPreference: 'high-performance', localClippingEnabled: true }}
      camera={{ fov: 40, near: 0.1, far: 60, position: [0.4, -0.15, 7.4] }}
      style={{ position: 'absolute', inset: 0 }}
      eventSource={document.body}
      eventPrefix="client"
      aria-hidden
    >
      <color attach="background" args={['#0b0a0f']} />
      <fog attach="fog" args={['#0b0a0f', 9, 26]} />
      <CameraRig />
      <MoodLights />
      <Lamp />
      <Desk reflect={fx && wide} />
      <Printer />
      <Pool>
        {(pool) => (
          <>
            <Sheets pool={pool} />
            <EndHelix pool={pool} />
          </>
        )}
      </Pool>
      <Dust />
      <RiverTerrain />
      <Constellation />
      <Ring onPick={onPickChapter} />
      {fx && <Effects />}
    </Canvas>
  )
}
