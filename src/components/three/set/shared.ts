import * as THREE from 'three'

/** the desk surface — everything in the set stands on it */
export const DESK_Y = -2.2

/** Tiny seeded PRNG so the world is identical on every load. */
export function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** frame-rate independent lerp factor */
export const ease = (dt: number, speed = 6) => 1 - Math.exp(-Math.min(dt, 0.1) * speed)

export const AMBER = new THREE.Color('#f5b74a')
export const TEAL = new THREE.Color('#4fd1c5')
export const PAPER = new THREE.Color('#f4efe4')

/** A vertical gradient alpha map (white → black), reused for soft-edged glows. */
export function gradientAlpha(stops: [number, number][] = [[0, 1], [1, 0]]): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 4
  c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 0, 256)
  for (const [at, a] of stops) grad.addColorStop(at, `rgba(255,255,255,${a})`)
  g.fillStyle = '#000'
  g.fillRect(0, 0, 4, 256)
  g.fillStyle = grad
  g.fillRect(0, 0, 4, 256)
  const t = new THREE.CanvasTexture(c)
  return t
}
