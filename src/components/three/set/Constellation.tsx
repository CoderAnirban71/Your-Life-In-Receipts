import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { threads, txById } from '../../../lib/data'
import { world } from '../../../lib/world'
import { makeLabelSprite } from '../labelSprite'
import { ease, mulberry32 } from './shared'

const KIND_COLOR: Record<string, string> = {
  money: '#f5b74a',
  silence: '#e9e2d3',
  music: '#4fd1c5',
  night: '#a78bfa',
  health: '#fb7185',
  family: '#f472b6',
}

export const CONST_POS: [number, number, number] = [2.9, 0.4, -3.4]

interface Node {
  p: THREE.Vector3
  c: THREE.Color
  r: number
  phase: number
  hub: boolean
  thread: number
}

/**
 * Every thread's evidence, hung in the air as a constellation: one cluster per thread,
 * hub lit in the thread's colour, receipts strung to it. It turns slowly and the
 * labels face the camera, like the credits of a film you are inside of.
 */
export function Constellation() {
  const group = useRef<THREE.Group>(null)
  const inst = useRef<THREE.InstancedMesh>(null)
  const lines = useRef<THREE.LineSegments>(null)
  const { nodes, lineGeo, labels } = useMemo(() => {
    const rnd = mulberry32(11)
    const nodes: Node[] = []
    const lpos: number[] = []
    const lcol: number[] = []
    const labels: { sprite: THREE.Sprite; at: THREE.Vector3 }[] = []
    const N = threads.length
    threads.forEach((th, i) => {
      const a = (i / N) * Math.PI * 2
      const hub = new THREE.Vector3(Math.cos(a) * 3.9, ((i % 3) - 1) * 1.55 + (rnd() - 0.5) * 0.5, Math.sin(a) * 2.8)
      const c = new THREE.Color(KIND_COLOR[th.kind] ?? '#f5b74a')
      nodes.push({ p: hub, c, r: 0.09, phase: rnd() * 6, hub: true, thread: i })
      let prev = hub
      th.evidence.forEach((id) => {
        const t = txById.get(id)
        if (!t) return
        const spread = 0.45 + Math.log10(1 + t.amt) * 0.14
        const p = new THREE.Vector3(hub.x + (rnd() - 0.5) * spread * 2, hub.y + (rnd() - 0.5) * spread * 1.4, hub.z + (rnd() - 0.5) * spread * 2)
        nodes.push({ p, c, r: 0.035 + Math.log10(1 + t.amt) * 0.008, phase: rnd() * 6, hub: false, thread: i })
        lpos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z)
        lcol.push(c.r, c.g, c.b, c.r, c.g, c.b)
        prev = p
      })
      const sprite = makeLabelSprite(th.title, { size: 19, sub: th.subtitle })
      labels.push({ sprite, at: hub.clone().add(new THREE.Vector3(0, i % 2 ? 0.62 : -0.62, 0)) })
    })
    const lg = new THREE.BufferGeometry()
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lpos, 3))
    lg.setAttribute('color', new THREE.Float32BufferAttribute(lcol, 3))
    return { nodes, lineGeo: lg, labels }
  }, [])

  const geo = useMemo(() => new THREE.SphereGeometry(1, 14, 14), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 1.6, roughness: 0.3, transparent: true, opacity: 0, toneMapped: false }), [])
  const lineMat = useMemo(() => new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false }), [])
  useEffect(() => {
    if (!inst.current) return
    nodes.forEach((nd, i) => inst.current!.setColorAt(i, nd.c))
    inst.current.instanceColor!.needsUpdate = true
  }, [nodes])
  useEffect(() => () => {
    geo.dispose()
    mat.dispose()
    lineMat.dispose()
    lineGeo.dispose()
  }, [geo, mat, lineMat, lineGeo])

  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const v = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, dt) => {
    if (!group.current || !inst.current) return
    const t = state.clock.elapsedTime
    const w = world.w.threads
    const target = Math.max(0, (w - 0.05) / 0.95)
    mat.opacity += (target - mat.opacity) * ease(dt, 4)
    lineMat.opacity = mat.opacity * 0.5
    group.current.visible = mat.opacity > 0.02
    if (!group.current.visible) return
    // a slow orbit, nudged by the pointer; nodes breathe
    group.current.rotation.y = t * 0.05 + world.px * 0.3
    group.current.rotation.x = Math.sin(t * 0.13) * 0.08 - world.py * 0.12
    const focus = world.thread
    nodes.forEach((nd, i) => {
      const pulse = nd.hub ? 1 + Math.sin(t * 2 + nd.phase) * 0.18 : 1 + Math.sin(t * 1.4 + nd.phase) * 0.12
      // the thread whose card is being read swells; the others hold still
      const lit = focus < 0 ? 1 : nd.thread === focus ? 1.7 : 0.75
      const r = nd.r * pulse * lit * (0.4 + 0.6 * mat.opacity)
      v.copy(nd.p)
      v.y += Math.sin(t * 0.6 + nd.phase) * 0.05
      m4.makeScale(r, r, r).setPosition(v)
      inst.current!.setMatrixAt(i, m4)
    })
    inst.current.instanceMatrix.needsUpdate = true
    labels.forEach((l, i) => {
      const m = l.sprite.material as THREE.SpriteMaterial
      const want = mat.opacity * (focus < 0 ? 0.55 : i === focus ? 1 : 0.22)
      m.opacity += (want - m.opacity) * ease(dt, 5)
    })
  })

  return (
    <group ref={group} position={CONST_POS}>
      <instancedMesh ref={inst} args={[geo, mat, nodes.length]} frustumCulled={false} />
      <lineSegments ref={lines} geometry={lineGeo} material={lineMat} />
      {labels.map((l, i) => (
        <primitive key={i} object={l.sprite} position={l.at} />
      ))}
    </group>
  )
}
