import * as THREE from 'three'

/**
 * Text as a sprite texture — crisp, font-file-free labels for the 3D world
 * (thread names in the constellation, credits on the end helix).
 */
export function makeLabelSprite(
  text: string,
  opts: { color?: string; size?: number; sub?: string; mono?: boolean } = {},
): THREE.Sprite {
  const k = 2
  const font = opts.mono ? '"Space Mono", monospace' : '"Fraunces", Georgia, serif'
  const size = opts.size ?? 26
  const c = document.createElement('canvas')
  const g = c.getContext('2d')!
  g.font = `${opts.mono ? '' : '500 '}${size}px ${font}`
  const w = Math.ceil(g.measureText(text).width) + 40
  const h = opts.sub ? size * 2.6 : size * 1.8
  c.width = w * k
  c.height = h * k
  g.scale(k, k)
  g.font = `${opts.mono ? '' : '500 '}${size}px ${font}`
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  g.shadowColor = 'rgba(0,0,0,0.9)'
  g.shadowBlur = 8
  g.fillStyle = opts.color ?? '#f4efe4'
  g.fillText(text, w / 2, opts.sub ? size * 0.9 : h / 2)
  if (opts.sub) {
    g.font = `${size * 0.42}px "Space Mono", monospace`
    g.fillStyle = 'rgba(244,239,228,0.7)'
    g.fillText(opts.sub.toUpperCase(), w / 2, size * 1.9)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 })
  const s = new THREE.Sprite(mat)
  const scale = 0.0115
  s.scale.set(w * scale, h * scale, 1)
  return s
}
