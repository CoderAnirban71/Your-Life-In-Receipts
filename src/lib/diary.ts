/**
 * The "Diary Layer": one honest sentence per day, composed only from what the
 * receipts and the listening log actually contain. No invented events - every
 * clause maps to a real row. This is the app's interpretation, and it says so
 * in the UI with the "pattern detected" tag.
 */
import type { Listen } from './data'
import type { Tx } from './types'
import { fmtDay, inr } from './format'

function topArtist(listens: Listen[]): string | null {
  if (!listens.length) return null
  const c = new Map<string, number>()
  for (const l of listens) c.set(l.artist, (c.get(l.artist) ?? 0) + 1)
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function nightPlays(listens: Listen[]): number {
  return listens.filter((l) => l.minOfDay < 4 * 60).length
}

function label(t: Tx): string {
  return (t.note || t.sub || t.cat).trim()
}

export function diaryLine(day: string, receipts: Tx[], listens: Listen[]): string {
  const expenses = receipts.filter((t) => t.kind === 'expense')
  const income = receipts.filter((t) => t.kind === 'income')
  const biggest = [...expenses].sort((a, b) => b.amt - a.amt)[0]
  const spend = expenses.reduce((s, t) => s + t.amt, 0)
  const artist = topArtist(listens)
  const night = nightPlays(listens)
  const parts: string[] = []

  parts.push(fmtDay(day, true) + '.')

  if (income.length) {
    const big = [...income].sort((a, b) => b.amt - a.amt)[0]
    parts.push(`${inr(big.amt)} came in — "${label(big)}".`)
  }

  if (biggest) {
    const rest = expenses.length - 1
    parts.push(
      `${inr(biggest.amt)} on "${label(biggest)}"` +
        (rest > 0 ? `, plus ${rest} smaller receipt${rest > 1 ? 's' : ''} (${inr(spend)} in all).` : '.'),
    )
  } else if (!income.length) {
    parts.push('Not a single receipt.')
  }

  if (listens.length === 0) {
    parts.push(receipts.length ? 'No music at all.' : 'No music either. A day that left no trace.')
  } else {
    const hrs = listens.reduce((s, l) => s + l.seconds, 0) / 3600
    parts.push(
      `${listens.length} song${listens.length > 1 ? 's' : ''}` +
        (hrs >= 1 ? ` — ${hrs.toFixed(1)} hours` : '') +
        (artist ? `, mostly ${artist}` : '') +
        (night >= 5 ? `, ${night} of them after midnight.` : '.'),
    )
  }

  return parts.join(' ')
}
