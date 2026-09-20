/** Shapes emitted by scripts/build_data.py. Keep in sync with that file. */

export type Kind = 'expense' | 'income' | 'transfer'

export interface Tx {
  id: string
  ts: string // ISO local time
  d: string // YYYY-MM-DD
  h: number | null // hour of day when the ledger recorded a time
  mode: string
  cat: string
  sub: string
  note: string
  amt: number
  kind: Kind
  g: string // coarse group used for filter chips
}

/** [minutesSinceEpoch0, trackId, secondsPlayed, skipped] */
export type ListenRow = [number, number, number, number]
/** [track, artist, album] */
export type TrackRow = [string, string, string]

export interface Day {
  d: string
  spend: number
  income: number
  tx: number
  min: number
  plays: number
  artist: string | null
  cat: string | null
}

export interface SeriesPoint {
  d: string
  v: number
  label?: string
}

export interface Thread {
  id: string
  kind: 'money' | 'silence' | 'music' | 'night' | 'health' | 'family'
  icon: string
  title: string
  subtitle: string
  stat: string
  statLabel: string
  caption: string
  evidence: string[]
  range: [string, string]
  series?: SeriesPoint[]
  artists?: { artist: string; min: number }[]
  tracks?: { track: string; artist: string; plays: number }[]
}

export interface Chapter {
  n: number
  title: string
  tagline: string
  body: string
  range: [string, string]
  spend: number
  income: number
  receipts: number
  plays: number
  hours: number
  topCats: { g: string; amt: number }[]
  artists: { artist: string; min: number }[]
  track: { track: string; artist: string; plays: number } | null
  biggest: { id: string; note: string; amt: number; d: string }[]
  threads: string[]
}

export interface Meta {
  window: [string, string]
  epoch0: string
  receipts: number
  listens: number
  rawListens: number
  hours: number
  spend: number
  income: number
  tracks: number
  artists: number
  groups: string[]
}
