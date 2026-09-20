import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { chapters, threads } from '../lib/data'
import { scrollToAct, useStory } from '../lib/store'
import { jumpToChapter, world } from '../lib/world'
import { fmtDay, fmtMonth, inr } from '../lib/format'
import { SectionHeading } from '../components/shared/SectionHeading'

const N = chapters.length

/**
 * Act IV — the full roll. The seven chapters stand as receipts in a 3D ring behind the
 * page; scrolling turns it, and this panel tells the chapter that is facing you.
 * Everything a chapter has to say lives here, once.
 */
export function ActIV_FullRoll() {
  const { openDayDrawer, setRange, setActiveThread } = useStory()
  const [active, setActive] = useState(0)

  // follow the ring: the world's scroll listener already computed world.ring
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const i = Math.min(N - 1, Math.max(0, Math.round(world.ring * (N - 1))))
      setActive((a) => (a === i ? a : i))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const c = chapters[active]
  const related = threads.filter((t) => c.threads.includes(t.id))

  return (
    <section id="act-roll" className="relative scroll-mt-16 pt-24">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal/40 to-transparent" />
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <SectionHeading
          act="act iv · the full roll"
          title={
            <>
              Seven chapters,
              <br />
              standing in a ring.
            </>
          }
          lede={
            <>
              The same four years, read as a story instead of a spreadsheet. Each chapter is cut where the data changes its mood —
              a wedding, a new job, a summer of hospital bills. <strong>Scroll to turn the ring</strong>; the receipt facing you is the
              chapter you are reading. Tap a receipt to jump to it, tap a line to open that day.
            </>
          }
        />
      </div>

      {/* the ring track: tall so the scroll has room to turn seven chapters */}
      <div id="ring-track" className="relative h-[560vh]">
        <div className="sticky top-0 flex h-[100svh] items-end px-4 pb-8 sm:px-8 lg:items-center lg:pb-0">
          <div className="mx-auto w-full max-w-6xl">
            <AnimatePresence mode="wait">
              <motion.article
                key={active}
                initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="thin-scroll max-h-[82svh] w-full max-w-[560px] overflow-y-auto rounded-2xl border border-line bg-desk/75 p-5 shadow-2xl backdrop-blur-xl sm:p-7"
                aria-live="polite"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="eyebrow">
                    chapter {String(c.n).padStart(2, '0')} of {N} · {fmtMonth(c.range[0])} → {fmtMonth(c.range[1])}
                  </span>
                  <div className="flex gap-1.5">
                    <button onClick={() => jumpToChapter(Math.max(0, active - 1))} className="chip !px-2.5" aria-label="Previous chapter" disabled={active === 0}>
                      ←
                    </button>
                    <button onClick={() => jumpToChapter(Math.min(N - 1, active + 1))} className="chip !px-2.5" aria-label="Next chapter" disabled={active === N - 1}>
                      →
                    </button>
                  </div>
                </div>

                <h3 className="mt-3 font-serif text-[clamp(1.8rem,3.4vw,2.7rem)] font-medium leading-tight text-paper">{c.title}</h3>
                <p className="mt-1 font-serif italic text-[1.05rem] text-fog">{c.tagline}</p>
                <p className="prose-story mt-4 text-[1rem] leading-relaxed">{c.body}</p>

                <dl className="mt-5 grid grid-cols-4 gap-2 border-y border-dashed border-line py-3 font-mono">
                  {[
                    ['spent', inr(c.spend, true), 'text-amber'],
                    ['receipts', c.receipts.toLocaleString('en-IN'), ''],
                    ['songs', c.plays.toLocaleString('en-IN'), 'text-teal'],
                    ['hours', String(c.hours), ''],
                  ].map(([k, v, cls]) => (
                    <div key={k}>
                      <dt className="text-[9px] tracking-[0.2em] text-fog-2 uppercase">{k}</dt>
                      <dd className={`text-[15px] tabular-nums ${cls}`}>{v}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4">
                  <div className="eyebrow mb-2">biggest lines · tap to open the day</div>
                  <ul className="space-y-1">
                    {c.biggest.map((b) => (
                      <li key={b.id}>
                        <button onClick={() => openDayDrawer(b.d, b.id)} className="flex w-full items-baseline justify-between gap-3 rounded px-1 py-0.5 text-left font-mono text-[12px] hover:bg-white/5">
                          <span className="truncate">
                            <span className="text-fog-2">{fmtDay(b.d).slice(0, -5)}</span> · {b.note}
                          </span>
                          <span className="tabular-nums text-amber">{inr(b.amt)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {related.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {related.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setRange(t.range)
                          setActiveThread(t.id)
                          scrollToAct('river')
                        }}
                        className="chip"
                      >
                        {t.icon} {t.title}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        setRange(c.range)
                        setActiveThread(null)
                        scrollToAct('river')
                      }}
                      className="chip !border-amber/50 !text-amber hover:!bg-amber/10"
                    >
                      ↑ open on the river
                    </button>
                  </div>
                )}
              </motion.article>
            </AnimatePresence>
          </div>

          {/* progress dots */}
          <ol className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex" aria-hidden>
            {chapters.map((ch, i) => (
              <li key={ch.n}>
                <button onClick={() => jumpToChapter(i)} className={`block h-2 w-2 rounded-full transition ${i === active ? 'bg-amber scale-125' : 'bg-fog-2 hover:bg-fog'}`} aria-label={`Chapter ${ch.n}`} />
              </li>
            ))}
          </ol>
        </div>
      </div>

    </section>
  )
}

/** The credits. Its own act so the camera can pull back over the spiral. */
export function ActV_End() {
  const { resetRange } = useStory()
  return (
    <section id="act-end" className="relative scroll-mt-16">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-[30svh] sm:px-8 md:pt-[40svh]">
        <motion.div
          className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:items-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ duration: 1 }}
        >
          <div>
            <span className="eyebrow">end of roll</span>
            <h3 className="mt-3 font-serif font-light text-[clamp(2rem,4.5vw,3.6rem)] leading-[1.02] text-paper">
              The last line in the file is two plates of idli-vada, ₹60.
            </h3>
            <p className="prose-story mt-5 max-w-[56ch]">
              Nobody sits down to write the story of their life. It gets written anyway — in ₹30 train tickets, in a ₹45,000 gift, in
              the month with no music, in 84 attempts at one song. The receipts were never about money. They were a diary that
              didn't know it was one.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  resetRange()
                  scrollToAct('hook')
                }}
                className="rounded-full bg-paper px-6 py-3 font-mono text-[12px] font-bold tracking-[0.18em] text-ink transition hover:bg-amber"
              >
                READ IT AGAIN ↑
              </button>
              <button onClick={() => scrollToAct('river')} className="chip !py-3 !px-5">
                find your own thread
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
