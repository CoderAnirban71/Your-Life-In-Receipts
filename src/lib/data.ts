/**
 * Static data access. Everything here was pre-computed by scripts/build_data.py
 * so the browser never parses a CSV. The two big files (listens + tracks) are
 * loaded lazily the first time a day is opened, keeping the initial bundle lean.
 */
import transactionsJson from '../data/transactions.json'
import dailyJson from '../data/daily.json'
import threadsJson from '../data/threads.json'
import chaptersJson from '../data/chapters.json'
import metaJson from '../data/meta.json'
import type { Chapter, Day, ListenRow, Meta, Thread, TrackRow, Tx } from './types'
import { parseDay } from './format'

export const transactions = transactionsJson as Tx[]
export const daily = dailyJson as Day[]
export const threads = threadsJson as Thread[]
export const chapters = chaptersJson as Chapter[]
export const meta = metaJson as Meta

export const txById = new Map(transactions.map((t) => [t.id, t]))

export const txByDay: Map<string, Tx[]> = (() => {
  const m = new Map<string, Tx[]>()
  for (const t of transactions) {
    const arr = m.get(t.d)
    if (arr) arr.push(t)
    else m.set(t.d, [t])
  }
  return m
})()

export const dayByDate = new Map(daily.map((d) => [d.d, d]))

const EPOCH0 = parseDay(meta.epoch0).getTime()

export interface Listen {
  /** minutes since epoch0 */
  m: number
  day: string
  minOfDay: number
  track: string
  artist: string
  album: string
  seconds: number
  skipped: boolean
}

let listenCache: Promise<Map<string, Listen[]>> | null = null

/** Lazily load + index the listening log by day. */
export function loadListens(): Promise<Map<string, Listen[]>> {
  if (!listenCache) {
    listenCache = Promise.all([
      import('../data/listens.json'),
      import('../data/tracks.json'),
    ]).then(([l, t]) => {
      const rows = l.default as ListenRow[]
      const tracks = t.default as TrackRow[]
      const byDay = new Map<string, Listen[]>()
      for (const [m, tid, sec, sk] of rows) {
        const date = new Date(EPOCH0 + m * 60_000)
        const y = date.getFullYear()
        const mo = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        const day = `${y}-${mo}-${d}`
        const [track, artist, album] = tracks[tid]
        const row: Listen = {
          m,
          day,
          minOfDay: date.getHours() * 60 + date.getMinutes(),
          track,
          artist,
          album,
          seconds: sec,
          skipped: sk === 1,
        }
        const arr = byDay.get(day)
        if (arr) arr.push(row)
        else byDay.set(day, [row])
      }
      return byDay
    })
  }
  return listenCache
}
