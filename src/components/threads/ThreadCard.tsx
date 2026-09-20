import { motion } from 'motion/react'
import type { Thread } from '../../lib/types'
import { txById } from '../../lib/data'
import { scrollToAct, useStory } from '../../lib/store'
import { fmtDay, fmtHour, inr } from '../../lib/format'
import { Sparkline } from '../shared/Sparkline'

const KIND_COLOR: Record<Thread['kind'], string> = {
  money: '#f5b74a',
  silence: '#e9e2d3',
  music: '#4fd1c5',
  night: '#a78bfa',
  health: '#fb7185',
  family: '#f472b6',
}

export function ThreadCard({ thread, index }: { thread: Thread; index: number }) {
  const { setRange, setActiveThread, openDayDrawer, activeThread } = useStory()
  const color = KIND_COLOR[thread.kind]
  const evidence = thread.evidence.map((id) => txById.get(id)).filter((t): t is NonNullable<typeof t> => !!t).slice(0, 5)
  const active = activeThread === thread.id

  const openInRiver = () => {
    setRange(thread.range)
    setActiveThread(thread.id)
    scrollToAct('river')
  }

  const series = thread.series ?? []
  const isHourly = thread.id === '3am-club'

  return (
    <motion.article
      className={`relative rounded-xl border p-6 sm:p-7 bg-desk/75 backdrop-blur-md transition-colors ${active ? 'border-amber/60 glow-amber' : 'border-line'}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.7, delay: (index % 2) * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow" style={{ color }}>
            {thread.icon} thread {String(index + 1).padStart(2, '0')} · {thread.subtitle}
          </span>
          <h3 className="mt-2 font-serif text-[clamp(1.5rem,2.6vw,2.1rem)] font-medium leading-tight text-paper">{thread.title}</h3>
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_180px]">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[clamp(2rem,4vw,3rem)] font-bold tabular-nums leading-none" style={{ color }}>
              {thread.stat}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] tracking-wide text-fog-2 max-w-[42ch]">{thread.statLabel}</p>
          <p className="prose-story mt-4 text-[1.02rem]">{thread.caption}</p>
        </div>

        <div className="flex flex-col justify-end gap-2">
          {series.length > 0 && (
            <Sparkline
              points={isHourly ? series.map((p) => ({ ...p, d: fmtHour(Number(p.d)) })) : series}
              color={color}
              mode={thread.kind === 'silence' || isHourly ? 'area' : 'bars'}
              height={64}
            />
          )}
          {isHourly && (
            <div className="flex justify-between font-mono text-[9px] text-fog-2">
              <span>12AM</span>
              <span>12PM</span>
              <span>11PM</span>
            </div>
          )}
          {thread.artists && (
            <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-fog">
              {thread.artists.slice(0, 3).map((a) => (
                <li key={a.artist} className="flex justify-between gap-2">
                  <span className="truncate">♪ {a.artist}</span>
                  <span className="text-fog-2 tabular-nums">{a.min}m</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {evidence.length > 0 && (
        <div className="mt-5 border-t border-dashed border-line pt-4">
          <div className="eyebrow mb-2">evidence · tap a receipt</div>
          <ul className="flex flex-wrap gap-2">
            {evidence.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => openDayDrawer(t.d, t.id)}
                  className="chip !normal-case !tracking-normal"
                  title={fmtDay(t.d)}
                >
                  <span className="text-fog-2">{fmtDay(t.d).slice(0, -5)}</span> {(t.note || t.sub || t.cat).slice(0, 34)}{' '}
                  <span style={{ color }}>{inr(t.amt, true)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={openInRiver} className="chip !border-amber/50 !text-amber hover:!bg-amber/10">
          ↑ open this period on the river
        </button>
      </div>
    </motion.article>
  )
}
