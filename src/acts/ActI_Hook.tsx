import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { meta } from '../lib/data'
import { scrollToAct } from '../lib/store'
import { fmtDay, inr } from '../lib/format'
import { AnimatedCounter } from '../components/shared/AnimatedCounter'

/** The summary receipt is printed by the 3D printer on the desk; this copy is for screen readers. */
const summary: [string, string][] = [
  ['Customer', 'R.'],
  ['Period', `${fmtDay(meta.window[0])} to ${fmtDay(meta.window[1])}`],
  ['Receipts', meta.receipts.toLocaleString('en-IN')],
  ['Songs played', meta.listens.toLocaleString('en-IN')],
  ['Hours of music', meta.hours.toLocaleString('en-IN')],
  ['Spent', inr(meta.spend)],
  ['Received', inr(meta.income)],
  ['Weddings', '1'],
  ['Root canals', '1'],
  ['Songs never finished', '84'],
  ['Transfers home', '41'],
  ['Total', 'one life'],
]

/** Act I — a blank receipt prints itself. The hook. */
export function ActI_Hook() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60])
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section id="act-hook" ref={ref} className="relative min-h-[100svh] overflow-hidden px-4 sm:px-8">
      {/* phones: keep the headline legible over the drifting paper */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-desk/80 via-desk/40 to-desk/0 md:hidden" />
      {/* desk lamp glow */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[-20%] h-[70vh] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,183,74,0.14),transparent)] blur-2xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 pt-24 pb-[58svh] md:min-h-[100svh] md:grid-cols-[1.05fr_0.95fr] md:pb-16 md:pt-16">
        <motion.div style={{ y: textY, opacity: fade }} className="relative z-10">
          <motion.span className="eyebrow block mb-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            an interactive data story · frontend only
          </motion.span>
          <motion.h1
            className="font-serif font-light text-[clamp(2.6rem,6.2vw,5.4rem)] leading-[0.98] tracking-tight text-paper"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            Somewhere in{' '}
            <em className="not-italic text-amber">
              <AnimatedCounter to={meta.receipts} duration={2200} />
            </em>{' '}
            receipts and{' '}
            <em className="not-italic text-teal">
              <AnimatedCounter to={meta.listens} duration={2600} />
            </em>{' '}
            songs, a person lived four years.
          </motion.h1>
          <motion.p
            className="prose-story mt-7 max-w-[54ch]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.1 }}
          >
            Money and music are the two most honest diaries anyone keeps. Neither one lies about who you were on a given night.
            This is what happens when you read them together — a household ledger and a streaming history, laid on the same
            table, one day at a time.
          </motion.p>
          <motion.div className="mt-9 flex flex-wrap gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
            <button
              onClick={() => scrollToAct('river')}
              className="rounded-full bg-paper px-6 py-3 font-mono text-[12px] font-bold tracking-[0.18em] text-ink transition hover:bg-amber focus-visible:bg-amber"
            >
              PRINT THE STORY ↓
            </button>
            <button onClick={() => scrollToAct('threads')} className="chip !py-3 !px-5">
              skip to the threads
            </button>
          </motion.div>
        </motion.div>

        {/* the right column is the printer on the desk, rendered by the 3D world */}
        <dl className="sr-only">
          {summary.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <motion.div
        aria-hidden
        className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.3em] text-fog-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5 }}
        style={{ opacity: fade }}
      >
        SCROLL
      </motion.div>
    </section>
  )
}
