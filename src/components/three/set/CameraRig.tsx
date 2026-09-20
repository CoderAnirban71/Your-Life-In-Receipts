import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ActId } from '../../../lib/store'
import { ACT_IDS, world } from '../../../lib/world'
import { CONST_POS } from './Constellation'
import { HELIX_POS } from './EndHelix'
import { RING_Y, ringX } from './Ring'
import { RIVER_SPAN, RIVER_Z, WATER_Y } from './RiverTerrain'
import { ease } from './shared'

interface Shot {
  pos: THREE.Vector3
  look: THREE.Vector3
}

/**
 * The camera is a character. Each act is a shot — a dolly-in on the printer, a
 * tracking shot along the river, an orbit round the constellation, a wide on the
 * ring, a pull-back for the credits — and scrolling cross-fades between them.
 */
export function CameraRig() {
  const { camera, size } = useThree()
  const mobile = size.width < 768
  const look = useRef(new THREE.Vector3(0.9, -0.7, 0))
  const shots = useMemo(() => {
    const s: Record<ActId, Shot> = {
      hook: { pos: new THREE.Vector3(), look: new THREE.Vector3() },
      river: { pos: new THREE.Vector3(), look: new THREE.Vector3() },
      threads: { pos: new THREE.Vector3(), look: new THREE.Vector3() },
      roll: { pos: new THREE.Vector3(), look: new THREE.Vector3() },
      end: { pos: new THREE.Vector3(), look: new THREE.Vector3() },
    }
    return s
  }, [])
  const tPos = useMemo(() => new THREE.Vector3(), [])
  const tLook = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const p = world.p
    const rx = ringX(size.width)

    // --- act I · dolly in on the printer as it prints
    if (mobile) {
      // phones: the headline owns the top half, the printer prints into the bottom half
      shots.hook.pos.set(0, 1.35, 9.4 - p.hook * 0.8)
      shots.hook.look.set(0, 1.25, 0)
    } else {
      shots.hook.pos.set(0.4, -0.15, 7.4 - p.hook * 1.1)
      shots.hook.look.set(1.0, -0.75, 0)
    }
    // --- act II · tracking shot along the river, Jan 2015 → Sep 2018
    const rxTrack = -RIVER_SPAN * 0.27 + p.river * RIVER_SPAN * 0.7
    shots.river.pos.set(rxTrack, WATER_Y + (mobile ? 2.2 : 1.7), mobile ? 7.4 : 5.2)
    shots.river.look.set(rxTrack * 0.92, WATER_Y - 0.1, RIVER_Z)
    // --- act III · slow orbit round the constellation
    shots.threads.pos.set(Math.sin(p.threads * Math.PI) * 2.4, 0.9, mobile ? 8.6 : 6.8)
    shots.threads.look.set(CONST_POS[0], CONST_POS[1], CONST_POS[2])
    // --- act IV · a wide on the ring; on phones look low so the card sits above the panel
    if (mobile) {
      shots.roll.pos.set(0, RING_Y + 1.4, 9.8)
      shots.roll.look.set(0, RING_Y - 1.3, 0)
    } else {
      // the panel sits on the left, so frame the ring's front card right of centre
      shots.roll.pos.set(rx - 2.3, RING_Y + 0.7, 7.6)
      shots.roll.look.set(rx - 2.3, RING_Y - 0.25, -0.4)
    }
    // --- credits · pull back and up over the spiral
    shots.end.pos.set(mobile ? 0 : 1.2, 3.4 + p.end * 1.2, mobile ? 16 : 13 + p.end * 1.5)
    shots.end.look.set(mobile ? 0 : HELIX_POS[0] * 0.42, HELIX_POS[1] + 3.6, HELIX_POS[2])

    // blend the shots by how much of each act is on screen
    tPos.set(0, 0, 0)
    tLook.set(0, 0, 0)
    let sum = 0
    for (const id of ACT_IDS) {
      const w = world.w[id]
      if (w <= 0) continue
      sum += w
      tPos.addScaledVector(shots[id].pos, w)
      tLook.addScaledVector(shots[id].look, w)
    }
    if (sum > 0) {
      tPos.multiplyScalar(1 / sum)
      tLook.multiplyScalar(1 / sum)
      // hand-held breath + pointer parallax
      tPos.x += world.px * 0.35 + Math.sin(t * 0.5) * 0.04
      tPos.y += -world.py * 0.2 + Math.sin(t * 0.8) * 0.03
      camera.position.lerp(tPos, ease(dt, 2.6))
      look.current.lerp(tLook, ease(dt, 2.6))
    }
    camera.lookAt(look.current)
  })
  return null
}
