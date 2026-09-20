import { useEffect, useState, type RefObject } from 'react'

/**
 * Decide whether a 3D scene should mount and animate:
 *  - never on devices that ask for reduced motion, or without WebGL
 *  - only while its container is (nearly) on screen, so off-screen scenes cost nothing
 */
export function useSceneGate(ref: RefObject<HTMLElement | null>) {
  const [ok] = useState(canRun)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || !ok) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '20% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, ok])

  return { mount: ok, active: ok && visible }
}

function canRun(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}
