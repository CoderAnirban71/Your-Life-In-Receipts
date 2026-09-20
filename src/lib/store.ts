import { create } from 'zustand'
import { meta } from './data'

export type ActId = 'hook' | 'river' | 'threads' | 'roll' | 'end'

/** Weak devices default to the lighter render path (no bloom / grain). */
function defaultFx(): boolean {
  if (typeof navigator === 'undefined') return true
  const nav = navigator as Navigator & { deviceMemory?: number }
  if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4) return false
  if (nav.deviceMemory && nav.deviceMemory < 4) return false
  return true
}

interface StoryState {
  /** inclusive [start, end] YYYY-MM-DD brushed on the River */
  range: [string, string]
  /** active category groups; empty = all */
  groups: Set<string>
  query: string
  /** the day currently opened in the drawer */
  openDay: string | null
  /** id of the receipt to highlight when the drawer opens */
  focusTx: string | null
  /** thread whose evidence is highlighted on the River */
  activeThread: string | null
  /** cinematic post-processing (bloom, grain, vignette) */
  fx: boolean
  /** synthesized ambience + printer ticks */
  sound: boolean

  setRange: (r: [string, string]) => void
  resetRange: () => void
  toggleGroup: (g: string) => void
  clearGroups: () => void
  setQuery: (q: string) => void
  openDayDrawer: (day: string, focusTx?: string | null) => void
  closeDay: () => void
  setActiveThread: (id: string | null) => void
  toggleFx: () => void
  toggleSound: () => void
}

export const useStory = create<StoryState>((set) => ({
  range: [meta.window[0], meta.window[1]],
  groups: new Set(),
  query: '',
  openDay: null,
  focusTx: null,
  activeThread: null,
  fx: defaultFx(),
  sound: false,

  setRange: (range) => set({ range }),
  resetRange: () => set({ range: [meta.window[0], meta.window[1]], activeThread: null }),
  toggleGroup: (g) =>
    set((s) => {
      const next = new Set(s.groups)
      if (next.has(g)) next.delete(g)
      else next.add(g)
      return { groups: next }
    }),
  clearGroups: () => set({ groups: new Set() }),
  setQuery: (query) => set({ query }),
  openDayDrawer: (openDay, focusTx = null) => set({ openDay, focusTx }),
  closeDay: () => set({ openDay: null, focusTx: null }),
  setActiveThread: (activeThread) => set({ activeThread }),
  toggleFx: () => set((s) => ({ fx: !s.fx })),
  toggleSound: () => set((s) => ({ sound: !s.sound })),
}))

/** Smooth-scroll to an act, respecting reduced motion. */
export function scrollToAct(id: ActId) {
  const el = document.getElementById(`act-${id}`)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}
