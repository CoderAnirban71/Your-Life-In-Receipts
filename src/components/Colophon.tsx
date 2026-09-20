import { meta } from '../lib/data'

/** How the story was made — the honest print at the bottom of the receipt. */
export function Colophon() {
  return (
    <footer className="border-t border-line px-4 py-16 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          <span className="eyebrow">what is real</span>
          <p className="mt-3 text-sm leading-relaxed text-fog">
            Every rupee, date, note, song, artist and timestamp on this page comes from the two provided datasets: a household
            transaction ledger ({meta.receipts.toLocaleString('en-IN')} lines, {meta.window[0].slice(0, 4)}–{meta.window[1].slice(0, 4)})
            and a Spotify streaming history (filtered to the same window: {meta.listens.toLocaleString('en-IN')} plays of 30 s or more, out of{' '}
            {meta.rawListens.toLocaleString('en-IN')}). Nothing was added. A third, noisy multi-user transaction file was inspected and set aside.
          </p>
        </div>
        <div>
          <span className="eyebrow">what is interpretation</span>
          <p className="mt-3 text-sm leading-relaxed text-fog">
            The two files were kept by different people. Reading them as one life is the deliberate creative move of this piece — a
            composite, named only <span className="font-mono text-paper">R.</span> The chapter titles, thread captions and the
            "pattern detected" diary lines are generated from the numbers by small, deterministic rules in{' '}
            <span className="font-mono text-paper">scripts/build_data.py</span> and <span className="font-mono text-paper">src/lib/diary.ts</span>. Spotify
            times are shown in IST.
          </p>
        </div>
        <div>
          <span className="eyebrow">how it is built</span>
          <p className="mt-3 text-sm leading-relaxed text-fog">
            React 19 · TypeScript · Vite · Tailwind v4 · Motion · D3 (scales, brush) · three.js + React Three Fiber (one persistent scene behind every act — drifting receipts, the paper river, the evidence constellation, the chapter ring — every 3D receipt painted from real ledger lines) · Zustand · Fuse.js. No backend: the CSVs are
            pre-aggregated once at build time into static JSON, the listening log loads lazily, the 3D scenes load lazily, pause off-screen and are skipped entirely without WebGL or under{' '}
            <span className="font-mono text-paper">prefers-reduced-motion</span>. Keyboard: ← → move between days, Esc closes.
          </p>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-6xl font-mono text-[10px] tracking-[0.2em] text-fog-2">
        "YOUR LIFE, IN RECEIPTS" · CHALLENGE TRACK · BUILT IN ONE SITTING
      </div>
    </footer>
  )
}
