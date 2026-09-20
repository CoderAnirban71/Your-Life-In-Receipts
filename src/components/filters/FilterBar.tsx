import { meta } from '../../lib/data'
import { useStory } from '../../lib/store'
import { fmtDay, GROUP_LABEL } from '../../lib/format'

const ORDER = [
  'food', 'transport', 'home', 'subscriptions', 'health', 'family', 'gifts', 'festivals',
  'culture', 'travel', 'style', 'learning', 'investing', 'income', 'transfers', 'other',
]

export function FilterBar({ count }: { count: number }) {
  const { groups, toggleGroup, clearGroups, query, setQuery, range, resetRange } = useStory()
  const full = range[0] === meta.window[0] && range[1] === meta.window[1]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative flex-1 min-w-[220px]">
          <span className="sr-only">Search receipts</span>
          <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog-2 font-mono text-sm">
            ⌕
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search a receipt… “netflix”, “Aai”, “root canal”, “2 tickets”"
            className="w-full rounded-md border border-line bg-white/[0.03] py-2.5 pl-9 pr-3 font-mono text-[13px] text-paper placeholder:text-fog-2 focus:border-amber/60 focus:bg-white/[0.05] focus:outline-none"
          />
        </label>
        <div className="font-mono text-[11px] tracking-widest text-fog-2" aria-live="polite">
          {count.toLocaleString('en-IN')} RECEIPT{count === 1 ? '' : 'S'}
          {!full && (
            <>
              {' · '}
              <span className="text-amber">{fmtDay(range[0])} → {fmtDay(range[1])}</span>{' '}
              <button onClick={resetRange} className="underline decoration-dotted underline-offset-4 hover:text-paper">
                show all
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        <button className="chip" aria-pressed={groups.size === 0} onClick={clearGroups}>
          everything
        </button>
        {ORDER.filter((g) => meta.groups.includes(g)).map((g) => (
          <button key={g} className="chip" aria-pressed={groups.has(g)} onClick={() => toggleGroup(g)}>
            {GROUP_LABEL[g] ?? g}
          </button>
        ))}
      </div>
    </div>
  )
}
