import { threads } from '../lib/data'
import { SectionHeading } from '../components/shared/SectionHeading'
import { ThreadCard } from '../components/threads/ThreadCard'

/** Act III — the threads. Patterns the pipeline found by reading both diaries at once. */
export function ActIII_Threads() {
  return (
    <section id="act-threads" className="relative scroll-mt-16 px-4 py-24 sm:px-8">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber/40 to-transparent" />
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          act="act iii · the threads"
          title={
            <>
              Five records that look unrelated.
              <br />
              One chapter of a life.
            </>
          }
          lede={
            <>
              These threads were not written by hand. A small detector pass reads the receipts and the listening log together and
              looks for things neither diary can show alone — silence after a wedding, spending that pulses with payday, a song
              that would not play. <strong>Every number links back to a real line.</strong>
            </>
          }
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {threads.map((t, i) => (
            <ThreadCard key={t.id} thread={t} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
