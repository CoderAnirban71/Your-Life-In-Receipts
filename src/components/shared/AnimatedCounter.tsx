import { useEffect, useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'motion/react'

interface Props {
  to: number
  duration?: number
  format?: (n: number) => string
  className?: string
}

/** Counts up from 0 the first time it scrolls into view. Instant under reduced motion. */
export function AnimatedCounter({ to, duration = 1600, format = (n) => Math.round(n).toLocaleString('en-IN'), className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const reduce = useReducedMotion()
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(to * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration, reduce])

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ''}`}>
      {format(reduce ? to : val)}
    </span>
  )
}
