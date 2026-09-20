import { lazy, Suspense } from 'react'
import { Nav } from './components/Nav'
import { DayDrawer } from './components/DayDrawer'
import { Colophon } from './components/Colophon'
import { WorldMount } from './components/three/WorldMount'
import { jumpToChapter } from './lib/world'
import { ActI_Hook } from './acts/ActI_Hook'
import { ActII_River } from './acts/ActII_River'

// Acts III + IV are below the fold: split them out of the first paint.
const ActIII_Threads = lazy(() => import('./acts/ActIII_Threads').then((m) => ({ default: m.ActIII_Threads })))
const ActIV_FullRoll = lazy(() => import('./acts/ActIV_FullRoll').then((m) => ({ default: m.ActIV_FullRoll })))

export default function App() {
  return (
    <>
      <a
        href="#act-river"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-paper focus:px-3 focus:py-2 focus:text-ink"
      >
        Skip to the explorer
      </a>
      {/* one 3D world behind every act */}
      <WorldMount onPickChapter={jumpToChapter} />
      <Nav />
      <main className="relative z-10">
        <ActI_Hook />
        <ActII_River />
        <Suspense fallback={<div className="px-8 py-24 font-mono text-[11px] tracking-[0.2em] text-fog-2">PRINTING…</div>}>
          <ActIII_Threads />
          <ActIV_FullRoll />
        </Suspense>
      </main>
      <div className="relative z-10">
        <Colophon />
      </div>
      <DayDrawer />
    </>
  )
}
