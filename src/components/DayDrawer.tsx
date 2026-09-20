import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { loadListens, txByDay, type Listen } from '../lib/data'
import { useStory } from '../lib/store'
import { diaryLine } from '../lib/diary'
import { fmtDay, fmtTime, GROUP_COLOR, GROUP_LABEL, inr, parseDay, toDay } from '../lib/format'
import { ReceiptStrip, ReceiptHeader, ReceiptRule, ReceiptLine } from './receipt/ReceiptStrip'

/**
 * One day, both diaries side by side: what was bought, what was playing.
 * This is where a receipt and a song become one moment.
 */
export function DayDrawer() {
  const { openDay, focusTx, closeDay, openDayDrawer } = useStory()
  const [listensByDay, setListensByDay] = useState<Map<string, Listen[]> | null>(null)

  useEffect(() => {
    if (openDay && !listensByDay) loadListens().then(setListensByDay)
  }, [openDay, listensByDay])

  // lock scroll + escape to close
  useEffect(() => {
    if (!openDay) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDay()
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDay])

  const step = (n: number) => {
    if (!openDay) return
    const d = parseDay(openDay)
    d.setDate(d.getDate() + n)
    openDayDrawer(toDay(d))
  }

  const receipts = useMemo(() => (openDay ? txByDay.get(openDay) ?? [] : []), [openDay])
  const listens = useMemo(() => (openDay && listensByDay ? listensByDay.get(openDay) ?? [] : []), [openDay, listensByDay])
  const line = useMemo(() => (openDay ? diaryLine(openDay, receipts, listens) : ''), [openDay, receipts, listens])

  const sessions = useMemo(() => {
    // collapse consecutive same-artist plays into "sessions" so long days stay readable
    const out: { start: number; end: number; artist: string; tracks: string[]; n: number }[] = []
    for (const l of listens) {
      const last = out[out.length - 1]
      if (last && last.artist === l.artist && l.minOfDay - last.end < 25) {
        last.end = l.minOfDay
        last.n += 1
        if (!last.tracks.includes(l.track) && last.tracks.length < 3) last.tracks.push(l.track)
      } else {
        out.push({ start: l.minOfDay, end: l.minOfDay, artist: l.artist, tracks: [l.track], n: 1 })
      }
    }
    return out
  }, [listens])

  return (
    <AnimatePresence>
      {openDay && (
        <motion.div
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Details for ${fmtDay(openDay, true)}`}
        >
          <button aria-label="Close" onClick={closeDay} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <motion.aside
            className="relative h-full w-full max-w-[520px] overflow-y-auto overflow-x-hidden thin-scroll bg-desk-2 border-l border-line p-5 sm:p-7"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2">
                <button onClick={() => step(-1)} className="chip" aria-label="Previous day">
                  ←
                </button>
                <button onClick={() => step(1)} className="chip" aria-label="Next day">
                  →
                </button>
              </div>
              <span className="eyebrow">{fmtDay(openDay, true)}</span>
              <button onClick={closeDay} className="chip" aria-label="Close panel">
                ✕
              </button>
            </div>

            <p className="prose-story mb-6">
              <span className="eyebrow block mb-2 text-amber">✦ pattern detected</span>
              {line}
            </p>

            <div className="grid gap-6 min-w-0 [&>*]:min-w-0">
              <ReceiptStrip width="wide" tear>
                <ReceiptHeader title="Receipts" sub={`${receipts.length} line${receipts.length === 1 ? '' : 's'}`} />
                <ReceiptRule />
                {receipts.length === 0 && <div className="py-3 text-center text-ink-2 text-[12px]">— nothing bought —</div>}
                {receipts.map((t) => (
                  <ReceiptLine
                    key={t.id}
                    className={t.id === focusTx ? 'bg-amber/30 -mx-1 px-1 rounded-sm' : ''}
                    left={
                      <>
                        <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: GROUP_COLOR[t.g] }} aria-hidden />
                        {t.h !== null && <span className="text-ink-2 mr-2">{String(t.h).padStart(2, '0')}:{t.ts.slice(14, 16)}</span>}
                        {t.note || t.sub || t.cat}
                        <span className="text-[10px] text-ink-2 ml-2">{(GROUP_LABEL[t.g] ?? '').toUpperCase()}</span>
                      </>
                    }
                    right={(t.kind === 'income' ? '+' : '') + inr(t.amt)}
                  />
                ))}
              </ReceiptStrip>

              <section className="rounded-lg border border-line p-4">
                <div className="flex items-baseline justify-between mb-3">
                  <span className="eyebrow text-teal">♪ what was playing</span>
                  <span className="font-mono text-[11px] text-fog-2">
                    {listensByDay ? `${listens.length} plays` : 'loading…'}
                  </span>
                </div>
                {listensByDay && listens.length === 0 && <div className="text-fog-2 text-sm">Silence. Not one song.</div>}
                <ol className="space-y-2">
                  {sessions.map((s, i) => (
                    <li key={i} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 text-[13px]">
                      <span className="font-mono text-[11px] text-fog-2 pt-0.5">
                        {fmtTime(s.start)}
                        {s.end !== s.start && <span className="block">–{fmtTime(s.end)}</span>}
                      </span>
                      <span className="min-w-0">
                        <span className="text-paper">{s.artist}</span>
                        <span className="text-fog-2"> · {s.n} play{s.n > 1 ? 's' : ''}</span>
                        <span className="block text-fog text-[12px] truncate">{s.tracks.join(' · ')}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
