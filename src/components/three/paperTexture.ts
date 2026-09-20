import * as THREE from 'three'

export interface PaperLine {
  left: string
  right?: string
  bold?: boolean
  rule?: boolean
  muted?: boolean
  center?: boolean
}

/**
 * Paint a receipt onto a 2D canvas and hand it to three.js as a texture. This keeps
 * every 3D receipt made of *real* text (no font files to load, no blurry SDF text)
 * and lets the paper look like the DOM receipts.
 */
export function makeReceiptTexture(lines: PaperLine[], opts: { w?: number; h?: number; title?: string; scale?: number } = {}): THREE.CanvasTexture {
  const k = opts.scale ?? 1
  const w = (opts.w ?? 256) / k
  const h = (opts.h ?? 512) / k
  const c = document.createElement('canvas')
  c.width = w * k
  c.height = h * k
  const g = c.getContext('2d')!
  g.scale(k, k)

  // paper + faint print rows
  g.fillStyle = '#f4efe4'
  g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(0,0,0,0.035)'
  for (let y = 0; y < h; y += 14) g.fillRect(0, y, w, 1)
  const edge = g.createLinearGradient(0, 0, w, 0)
  edge.addColorStop(0, 'rgba(0,0,0,0.06)')
  edge.addColorStop(0.12, 'rgba(0,0,0,0)')
  edge.addColorStop(0.88, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(0,0,0,0.06)')
  g.fillStyle = edge
  g.fillRect(0, 0, w, h)

  const pad = 18
  let y = 34
  g.textBaseline = 'alphabetic'
  if (opts.title) {
    g.fillStyle = '#1a1714'
    g.font = 'bold 13px "Space Mono", monospace'
    g.textAlign = 'center'
    g.fillText(opts.title.toUpperCase(), w / 2, y)
    y += 16
    dashed(g, pad, y, w - pad)
    y += 18
  }
  for (const l of lines) {
    if (y > h - 24) break
    if (l.rule) {
      dashed(g, pad, y - 6, w - pad)
      y += 12
      continue
    }
    g.fillStyle = l.muted ? '#6b655b' : '#1a1714'
    g.font = `${l.bold ? 'bold ' : ''}11px "Space Mono", monospace`
    if (l.center) {
      g.textAlign = 'center'
      g.fillText(l.left, w / 2, y)
    } else {
      g.textAlign = 'left'
      const rightW = l.right ? g.measureText(l.right).width + 8 : 0
      g.fillText(clip(g, l.left, w - pad * 2 - rightW), pad, y)
      if (l.right) {
        g.textAlign = 'right'
        g.fillText(l.right, w - pad, y)
      }
    }
    y += 16
  }

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

function dashed(g: CanvasRenderingContext2D, x0: number, y: number, x1: number) {
  g.strokeStyle = 'rgba(26,23,20,0.4)'
  g.lineWidth = 1
  g.setLineDash([3, 3])
  g.beginPath()
  g.moveTo(x0, y)
  g.lineTo(x1, y)
  g.stroke()
  g.setLineDash([])
}

function clip(g: CanvasRenderingContext2D, s: string, max: number): string {
  if (g.measureText(s).width <= max) return s
  let t = s
  while (t.length > 1 && g.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

/** A gently curled sheet of paper: a plane whose z follows a soft sine across its width. */
export function makeCurledPlane(w: number, h: number, curl = 0.08): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(w, h, 12, 24)
  const pos = geo.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / w
    const y = pos.getY(i) / h
    pos.setZ(i, Math.sin(x * Math.PI) * curl + Math.sin(y * Math.PI * 2) * curl * 0.35)
  }
  geo.computeVertexNormals()
  return geo
}
