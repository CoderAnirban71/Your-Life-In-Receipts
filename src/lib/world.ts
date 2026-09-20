/**
 * Shared, mutable scroll state for the 3D world. Written by one scroll listener,
 * read inside useFrame — never through React state, so scrolling never re-renders
 * the tree and the scene stays at 60fps.
 */
import { useEffect } from 'react'
import type { ActId } from './store'
import { chapters } from './data'

export interface WorldState {
  /** page scroll in px */
  scroll: number
  /** how much of each act is on screen, 0..1 (used to cross-fade scene elements and camera shots) */
  w: Record<ActId, number>
  /** 0..1 progress through each act (drives camera moves inside a shot) */
  p: Record<ActId, number>
  /** 0..1 progress through the Act IV ring section */
  ring: number
  /** pointer in -1..1 */
  px: number
  py: number
  /** index of the thread card currently in view (-1 = none) */
  thread: number
}

export const world: WorldState = {
  scroll: 0,
  w: { hook: 1, river: 0, threads: 0, roll: 0, end: 0 },
  p: { hook: 0, river: 0, threads: 0, roll: 0, end: 0 },
  ring: 0,
  px: 0,
  py: 0,
  thread: -1,
}

export const ACT_IDS: ActId[] = ['hook', 'river', 'threads', 'roll', 'end']

function measure() {
  const vh = window.innerHeight
  world.scroll = window.scrollY
  for (const id of ACT_IDS) {
    const el = document.getElementById(`act-${id}`)
    if (!el) {
      world.w[id] = 0
      world.p[id] = 0
      continue
    }
    const r = el.getBoundingClientRect()
    // fraction of the viewport this section covers, softened so neighbours cross-fade
    const visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0))
    world.w[id] = Math.min(1, visible / (vh * 0.75))
    // 0 when the section's top reaches the viewport top … 1 when its bottom is about to leave
    const span = Math.max(1, r.height - vh * 0.5)
    world.p[id] = Math.min(1, Math.max(0, -r.top / span))
  }
  const ring = document.getElementById('ring-track')
  if (ring) {
    const r = ring.getBoundingClientRect()
    const total = r.height - vh
    world.ring = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0
  }
}

/** Scroll the Act IV ring track so chapter i faces the camera. */
export function jumpToChapter(i: number) {
  const track = document.getElementById('ring-track')
  if (!track) return
  const top = track.getBoundingClientRect().top + window.scrollY
  const total = track.offsetHeight - window.innerHeight
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: top + (i / (chapters.length - 1)) * total + 2, behavior: reduce ? 'auto' : 'smooth' })
}

/** Install the single scroll/pointer listener that feeds the world. */
export function useWorldTracking() {
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    const onMove = (e: PointerEvent) => {
      world.px = (e.clientX / window.innerWidth) * 2 - 1
      world.py = (e.clientY / window.innerHeight) * 2 - 1
    }
    measure()
    // lazy acts mount later — re-measure a few times after load
    const timers = [600, 1500, 3000].map((ms) => window.setTimeout(measure, ms))
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      timers.forEach((t) => window.clearTimeout(t))
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])
}
