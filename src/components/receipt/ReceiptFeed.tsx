import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import type { Tx } from '../../lib/types'
import { useStory } from '../../lib/store'
import { fmtDay, GROUP_COLOR, GROUP_LABEL, inr } from '../../lib/format'
import { ReceiptStrip, ReceiptHeader, ReceiptRule, ReceiptLine } from './ReceiptStrip'

const PAGE = 60

/** The filtered ledger, printed as one long receipt. Click a line to open its day. */
export function ReceiptFeed({ rows }: { rows: Tx[] }) {
  const [limit, setLimit] = useState(PAGE)
  const openDayDrawer = useStory((s) => s.openDayDrawer)

  const total = useMemo(() => rows.filter((r) => r.kind === 'expense').reduce((s, r) => s + r.amt, 0), [rows])
  const income = useMemo(() => rows.filter((r) => r.kind === 'income').reduce((s, r) => s + r.amt, 0), [rows])
  // a day-stamp line is printed whenever the day changes
  const shown = useMemo(() => rows.slice(0, limit).map((t, i, arr) => ({ t, stamp: i === 0 || arr[i - 1].d !== t.d })), [rows, limit])

  return (
    <ReceiptStrip width="wide" className="mx-auto">
      <ReceiptHeader title="Every Receipt Remembers" sub={`${rows.length.toLocaleString('en-IN')} lines · sorted newest first`} />
      <ReceiptRule />
      <div className="max-h-[560px] overflow-y-auto thin-scroll pr-1">
        {shown.length === 0 && <div className="py-8 text-center text-ink-2 text-[12px]">nothing printed for this filter — try another word</div>}
        {shown.map(({ t, stamp }, i) => {
          const text = t.note || t.sub || t.cat
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(0.6, (i % PAGE) * 0.012) }}
            >
              {stamp && (
                <div className="mt-3 mb-1 flex items-center gap-2 text-[10px] tracking-[0.18em] text-ink-2">
                  <span>{fmtDay(t.d).toUpperCase()}</span>
                  <span className="flex-1 border-t border-dashed border-ink/25" />
                </div>
              )}
              <button
                onClick={() => openDayDrawer(t.d, t.id)}
                className="w-full text-left rounded-sm px-1 -mx-1 hover:bg-black/[0.05] focus-visible:bg-black/[0.06]"
                title={`Open ${fmtDay(t.d)}`}
              >
                <ReceiptLine
                  left={
                    <>
                      <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: GROUP_COLOR[t.g] ?? '#999' }} aria-hidden />
                      <span className="text-[10px] text-ink-2 mr-2">{(GROUP_LABEL[t.g] ?? t.g).toUpperCase()}</span>
                      {text}
                    </>
                  }
                  right={
                    <span className={t.kind === 'income' ? 'text-emerald-700' : t.kind === 'transfer' ? 'text-ink-2' : ''}>
                      {t.kind === 'income' ? '+' : t.kind === 'transfer' ? '⇄ ' : ''}
                      {inr(t.amt)}
                    </span>
                  }
                />
              </button>
            </motion.div>
          )
        })}
        {rows.length > limit && (
          <button
            onClick={() => setLimit((l) => l + PAGE)}
            className="mt-4 w-full border border-dashed border-ink/40 py-2 text-[11px] tracking-[0.18em] hover:bg-black/[0.04]"
          >
            PRINT {Math.min(PAGE, rows.length - limit)} MORE ▾
          </button>
        )}
      </div>
      <ReceiptRule />
      <ReceiptLine left="SPENT" right={inr(total)} className="font-bold" />
      {income > 0 && <ReceiptLine left="RECEIVED" right={`+${inr(income)}`} muted />}
      <div className="mt-4 text-center text-[10px] tracking-[0.2em] text-ink-2">THANK YOU FOR LIVING</div>
    </ReceiptStrip>
  )
}
