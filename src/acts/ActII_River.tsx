import { useMemo } from 'react'
import Fuse from 'fuse.js'
import { transactions } from '../lib/data'
import { useStory } from '../lib/store'
import { SectionHeading } from '../components/shared/SectionHeading'
import { RiverOfDays } from '../components/river/RiverOfDays'
import { FilterBar } from '../components/filters/FilterBar'
import { ReceiptFeed } from '../components/receipt/ReceiptFeed'

const fuse = new Fuse(transactions, {
  keys: [
    { name: 'note', weight: 0.6 },
    { name: 'sub', weight: 0.25 },
    { name: 'cat', weight: 0.15 },
  ],
  threshold: 0.32,
  ignoreLocation: true,
  minMatchCharLength: 2,
})

/** Act II — the map. Explore, brush, filter, search; every line opens a day. */
export function ActII_River() {
  const range = useStory((s) => s.range)
  const groups = useStory((s) => s.groups)
  const query = useStory((s) => s.query)

  const rows = useMemo(() => {
    const q = query.trim()
    const base = q.length >= 2 ? fuse.search(q).map((r) => r.item) : transactions
    const filtered = base.filter((t) => t.d >= range[0] && t.d <= range[1] && (groups.size === 0 || groups.has(t.g)))
    // newest first unless searching, where relevance order is more useful
    return q.length >= 2 ? filtered : [...filtered].sort((a, b) => (a.ts < b.ts ? 1 : -1))
  }, [range, groups, query])

  return (
    <section id="act-river" className="relative scroll-mt-16 px-4 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          act="act ii · the map"
          title={
            <>
              Money above the line.
              <br />
              Music below it.
            </>
          }
          lede={
            <>
              Every day of the ledger, as one shape. <strong>Drag</strong> across the river to focus a period, <strong>hover</strong> to
              read a day, <strong>click</strong> to open it and see what was playing when the money left.
            </>
          }
        />

        <div className="rounded-xl border border-line bg-desk-2/60 p-3 sm:p-5">
          <RiverOfDays />
        </div>

        <div className="mt-10">
          <FilterBar count={rows.length} />
        </div>

        <div className="mt-10">
          <ReceiptFeed rows={rows} />
        </div>
      </div>
    </section>
  )
}
