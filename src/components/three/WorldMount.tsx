import { lazy, Suspense, useRef } from 'react'
import { useSceneGate } from './useSceneGate'
import { useWorldTracking } from '../../lib/world'

const World = lazy(() => import('./World').then((m) => ({ default: m.World })))

/**
 * Mounts the persistent 3D world behind the page. Nothing here renders without WebGL
 * or under prefers-reduced-motion — the DOM story is complete on its own.
 */
export function WorldMount({ onPickChapter }: { onPickChapter: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const { mount } = useSceneGate(ref)
  useWorldTracking()
  return (
    <div ref={ref} className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      {mount && (
        <Suspense fallback={null}>
          <World onPickChapter={onPickChapter} />
        </Suspense>
      )}
      {/* vignette keeps type legible over the moving paper, on every act */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(11,10,15,0.75)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-desk to-transparent" />
    </div>
  )
}
