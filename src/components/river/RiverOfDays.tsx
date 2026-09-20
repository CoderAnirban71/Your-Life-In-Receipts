import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { chapters, daily, meta, threads, txById } from '../../lib/data'
import { useStory } from '../../lib/store'
import { fmtDay, inr, parseDay, toDay } from '../../lib/format'

interface Bin {
  d0: string
  d1: string
  t0: number
  spend: number
  income: number
  min: number
  plays: number
  tx: number
  artist: string | null
}

const M = { top: 28, right: 12, bottom: 26, left: 12 }

/**
 * Money above the waterline, music below it. One shape, two datasets, every day
 * of the ledger. Brush to focus, hover to read, click to open a day.
 */
export function RiverOfDays() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const brushRef = useRef<SVGGElement>(null)
  const [width, setWidth] = useState(900)
  const [hover, setHover] = useState<Bin | null>(null)
  const range = useStory((s) => s.range)
  const setRange = useStory((s) => s.setRange)
  const openDayDrawer = useStory((s) => s.openDayDrawer)
  const activeThread = useStory((s) => s.activeThread)

  const height = width < 640 ? 260 : 340

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(Math.max(320, Math.floor(e.contentRect.width)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const innerW = width - M.left - M.right
  const innerH = height - M.top - M.bottom
  const mid = M.top + innerH * 0.55

  // bin days so each bar is at least ~2px wide on narrow screens
  const bins = useMemo<Bin[]>(() => {
    const per = Math.max(1, Math.ceil(daily.length / (innerW / 2.2)))
    const out: Bin[] = []
    for (let i = 0; i < daily.length; i += per) {
      const slice = daily.slice(i, i + per)
      const artists = new Map<string, number>()
      for (const d of slice) if (d.artist) artists.set(d.artist, (artists.get(d.artist) ?? 0) + d.plays)
      const artist = [...artists.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      out.push({
        d0: slice[0].d,
        d1: slice[slice.length - 1].d,
        t0: parseDay(slice[0].d).getTime(),
        spend: d3.sum(slice, (d) => d.spend),
        income: d3.sum(slice, (d) => d.income),
        min: d3.sum(slice, (d) => d.min),
        plays: d3.sum(slice, (d) => d.plays),
        tx: d3.sum(slice, (d) => d.tx),
        artist,
      })
    }
    return out
  }, [innerW])

  const x = useMemo(
    () =>
      d3
        .scaleTime()
        .domain([parseDay(meta.window[0]), d3.timeDay.offset(parseDay(meta.window[1]), 1)])
        .range([M.left, M.left + innerW]),
    [innerW],
  )
  const ySpend = useMemo(
    () => d3.scaleSqrt().domain([0, d3.max(bins, (b) => b.spend) ?? 1]).range([0, mid - M.top]),
    [bins, mid],
  )
  const yMusic = useMemo(
    () => d3.scaleSqrt().domain([0, d3.max(bins, (b) => b.min) ?? 1]).range([0, M.top + innerH - mid]),
    [bins, innerH, mid],
  )
  const barW = Math.max(1, innerW / bins.length - 0.6)

  // ---- brush
  useEffect(() => {
    const g = brushRef.current
    if (!g) return
    const brush = d3
      .brushX()
      .extent([
        [M.left, M.top],
        [M.left + innerW, M.top + innerH],
      ])
      .on('end', (ev: d3.D3BrushEvent<unknown>) => {
        if (!ev.sourceEvent) return // programmatic move — don't loop
        if (!ev.selection) {
          // a plain click clears the brush visually; keep the store's range and
          // restore the selection so "click to open a day" never also resets focus
          const full = range[0] === meta.window[0] && range[1] === meta.window[1]
          if (!full) d3.select(g).call(brush.move, [x(parseDay(range[0])), x(d3.timeDay.offset(parseDay(range[1]), 1))])
          return
        }
        const [a, b] = ev.selection as [number, number]
        setRange([toDay(x.invert(a)), toDay(x.invert(b))])
      })
    const sel = d3.select(g)
    sel.call(brush)
    sel.selectAll('.selection').attr('fill', 'rgba(245,183,74,0.08)').attr('stroke', 'rgba(245,183,74,0.6)').attr('stroke-dasharray', '3 3')
    sel.selectAll('.handle').attr('fill', 'rgba(245,183,74,0.7)')
    sel.select('.overlay').attr('cursor', 'crosshair')
    // reflect the store range (e.g. a thread opened it) onto the brush
    const full = range[0] === meta.window[0] && range[1] === meta.window[1]
    if (full) sel.call(brush.move, null)
    else sel.call(brush.move, [x(parseDay(range[0])), x(d3.timeDay.offset(parseDay(range[1]), 1))])
    return () => {
      sel.on('.brush', null)
    }
  }, [innerW, innerH, x, range, setRange])

  // ---- hover (pointer over the overlay is captured by the brush, so we listen on the svg)
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const t = x.invert(px).getTime()
    let lo = 0
    let hi = bins.length - 1
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1
      if (bins[m].t0 <= t) lo = m
      else hi = m - 1
    }
    setHover(bins[lo] ?? null)
  }

  const axisTicks = useMemo(() => x.ticks(width < 640 ? 4 : 8), [x, width])

  // evidence markers for the active thread
  const markers = useMemo(() => {
    if (!activeThread) return []
    const th = threads.find((t) => t.id === activeThread)
    if (!th) return []
    return th.evidence.map((id) => txById.get(id)).filter(Boolean).map((t) => ({ d: t!.d, amt: t!.amt, note: t!.note || t!.sub || t!.cat }))
  }, [activeThread])

  const hoverX = hover ? x(new Date(hover.t0)) : 0
  const tipLeft = hover ? Math.min(Math.max(8, hoverX - 110), width - 230) : 0

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label="River of days: daily spending above the line, daily listening minutes below it. Drag to focus a period."
        className="block overflow-visible"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onClick={() => hover && openDayDrawer(hover.d0)}
      >
        <defs>
          <linearGradient id="riverMoney" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#f5b74a" />
            <stop offset="1" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="riverMusic" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#4fd1c5" />
            <stop offset="1" stopColor="#1f7a74" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* chapter bands */}
        {chapters.map((c, i) => {
          const a = x(parseDay(c.range[0]))
          const b = x(d3.timeDay.offset(parseDay(c.range[1]), 1))
          return (
            <g key={c.n}>
              <rect x={a} y={M.top - 20} width={b - a} height={innerH + 20} fill={i % 2 ? 'rgba(255,255,255,0.025)' : 'transparent'} />
              {b - a > 56 && (
                <text x={a + 4} y={M.top - 8} fontSize={9} fill="rgba(244,239,228,0.45)" fontFamily="var(--font-mono)" letterSpacing="0.08em">
                  {String(c.n).padStart(2, '0')} {b - a > 130 ? c.title.toUpperCase() : ''}
                </text>
              )}
            </g>
          )
        })}

        {/* money (up) */}
        {bins.map((b, i) => {
          const h = ySpend(b.spend)
          return (
            <rect key={`m${i}`} x={x(new Date(b.t0))} y={mid - h} width={barW} height={h} fill="url(#riverMoney)" opacity={0.92}>
              <title>{`${fmtDay(b.d0)}: ${inr(b.spend)} spent`}</title>
            </rect>
          )
        })}
        {/* music (down) */}
        {bins.map((b, i) => {
          const h = yMusic(b.min)
          return <rect key={`s${i}`} x={x(new Date(b.t0))} y={mid + 1} width={barW} height={h} fill="url(#riverMusic)" opacity={0.9} />
        })}

        {/* income ticks as tiny green marks on the waterline */}
        {bins.filter((b) => b.income >= 20000).map((b, i) => (
          <circle key={`i${i}`} cx={x(new Date(b.t0)) + barW / 2} cy={mid} r={1.8} fill="#86efac" opacity={0.9} />
        ))}

        {/* waterline */}
        <line x1={M.left} x2={M.left + innerW} y1={mid} y2={mid} stroke="rgba(244,239,228,0.35)" strokeWidth={1} />

        {/* thread evidence */}
        {markers.map((m, i) => (
          <g key={i} transform={`translate(${x(parseDay(m.d)) + barW / 2},${mid})`}>
            <line y1={-(mid - M.top)} y2={M.top + innerH - mid} stroke="rgba(251,113,133,0.55)" strokeDasharray="2 3" />
            <circle r={4} fill="#fb7185" stroke="#0b0a0f" strokeWidth={1.5}>
              <title>{`${fmtDay(m.d)} · ${m.note} · ${inr(m.amt)}`}</title>
            </circle>
          </g>
        ))}

        {/* axis */}
        {axisTicks.map((t, i) => (
          <g key={i} transform={`translate(${x(t)},${M.top + innerH})`}>
            <line y2={5} stroke="rgba(244,239,228,0.3)" />
            <text y={17} fontSize={10} textAnchor="middle" fill="rgba(244,239,228,0.55)" fontFamily="var(--font-mono)">
              {d3.timeFormat(width < 640 ? '%Y' : "%b '%y")(t)}
            </text>
          </g>
        ))}

        {/* hover crosshair */}
        {hover && <line x1={hoverX + barW / 2} x2={hoverX + barW / 2} y1={M.top} y2={M.top + innerH} stroke="rgba(244,239,228,0.6)" strokeWidth={1} pointerEvents="none" />}

        {/* brush layer sits on top so dragging works everywhere */}
        <g ref={brushRef} />

        {/* labels */}
        <text x={M.left + innerW} textAnchor="end" y={M.top + 10} fontSize={10} fill="#f5b74a" fontFamily="var(--font-mono)" letterSpacing="0.14em">
          ₹ SPENT
        </text>
        <text x={M.left + innerW} textAnchor="end" y={M.top + innerH - 4} fontSize={10} fill="#4fd1c5" fontFamily="var(--font-mono)" letterSpacing="0.14em">
          ♪ LISTENED
        </text>
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 w-[220px] rounded-md border border-line bg-desk-2/95 p-3 text-[12px] shadow-2xl backdrop-blur"
          style={{ left: tipLeft, top: 4 }}
          role="status"
        >
          <div className="font-mono text-[10px] tracking-widest text-fog-2">
            {hover.d0 === hover.d1 ? fmtDay(hover.d0) : `${fmtDay(hover.d0)} – ${fmtDay(hover.d1)}`}
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-amber">₹ spent</span>
            <span className="tabular-nums">{inr(hover.spend)}</span>
          </div>
          {hover.income > 0 && (
            <div className="flex justify-between">
              <span className="text-[#86efac]">₹ in</span>
              <span className="tabular-nums">{inr(hover.income)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-teal">♪ plays</span>
            <span className="tabular-nums">{hover.plays.toLocaleString('en-IN')}</span>
          </div>
          {hover.artist && <div className="mt-1 truncate text-fog">mostly {hover.artist}</div>}
          <div className="mt-2 text-[10px] text-fog-2">click to open this day</div>
        </div>
      )}
    </div>
  )
}
