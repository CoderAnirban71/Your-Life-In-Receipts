import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { SeriesPoint } from '../../lib/types'

interface Props {
  points: SeriesPoint[]
  color?: string
  /** 'bars' for discrete events (receipts), 'area' for continuous (plays) */
  mode?: 'bars' | 'area'
  height?: number
  className?: string
}

/**
 * Tiny inline SVG chart that "draws itself" the first time it appears. Hand-rolled
 * so each thread card stays under a couple of KB and needs no chart library.
 */
export function Sparkline({ points, color = 'var(--color-amber)', mode = 'bars', height = 48, className = '' }: Props) {
  const id = useId()
  const reduce = useReducedMotion()
  if (!points.length) return null
  const w = 100
  const max = Math.max(...points.map((p) => p.v), 1)
  const n = points.length

  if (mode === 'bars') {
    const gap = n > 24 ? 0.4 : 1.2
    const bw = Math.max(0.8, w / n - gap)
    return (
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={`w-full ${className}`} style={{ height }} role="img" aria-label="sparkline">
        {points.map((p, i) => {
          const h = Math.max(1.5, (p.v / max) * (height - 2))
          const x = (i / n) * w
          return (
            <motion.rect
              key={i}
              x={x}
              width={bw}
              y={height - h}
              height={h}
              rx={0.6}
              fill={color}
              initial={reduce ? false : { scaleY: 0, opacity: 0 }}
              whileInView={{ scaleY: 1, opacity: 0.9 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(1, i * 0.03), duration: 0.5, ease: 'easeOut' }}
              style={{ transformOrigin: `${x}px ${height}px` }}
            >
              <title>{`${p.label ? p.label + ' · ' : ''}${p.d}: ${p.v.toLocaleString('en-IN')}`}</title>
            </motion.rect>
          )
        })}
      </svg>
    )
  }

  const xs = points.map((_, i) => (i / Math.max(1, n - 1)) * w)
  const ys = points.map((p) => height - 1 - (p.v / max) * (height - 3))
  const line = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${ys[i].toFixed(2)}`).join(' ')
  const area = `${line} L${w},${height} L0,${height} Z`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={`w-full ${className}`} style={{ height }} role="img" aria-label="sparkline">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.45" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill={`url(#${id})`} initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: 'easeInOut' }}
      />
    </svg>
  )
}
