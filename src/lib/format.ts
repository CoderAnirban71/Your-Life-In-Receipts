const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** Parse a YYYY-MM-DD string as a local date (no timezone drift). */
export function parseDay(d: string): Date {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function toDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function fmtDay(d: string, long = false): string {
  const dt = parseDay(d)
  const m = long ? MONTHS_LONG[dt.getMonth()] : MONTHS[dt.getMonth()]
  return `${dt.getDate()} ${m} ${dt.getFullYear()}`
}

export function fmtMonth(d: string): string {
  const dt = parseDay(d)
  return `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`
}

export function fmtRange(a: string, b: string): string {
  return `${fmtDay(a)} → ${fmtDay(b)}`
}

/** Indian-style rupee formatting: ₹1,23,456 */
export function inr(n: number, compact = false): string {
  if (compact) {
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(n >= 1e6 ? 0 : 1)}L`
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k`
    return `₹${Math.round(n)}`
  }
  const s = Math.round(n).toString()
  if (s.length <= 3) return `₹${s}`
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `₹${rest},${last3}`
}

export function fmtNum(n: number): string {
  return n.toLocaleString('en-IN')
}

export function fmtHour(h: number): string {
  const suffix = h < 12 ? 'AM' : 'PM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh} ${suffix}`
}

export function fmtTime(minOfDay: number): string {
  const h = Math.floor(minOfDay / 60)
  const m = minOfDay % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function fmtMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} min`
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return m ? `${h}h ${m}m` : `${h}h`
}

/** Human label for the coarse category group. */
export const GROUP_LABEL: Record<string, string> = {
  food: 'Food',
  transport: 'Transport',
  home: 'Home',
  subscriptions: 'Subscriptions',
  health: 'Health',
  family: 'Family',
  gifts: 'Gifts',
  festivals: 'Festivals',
  culture: 'Movies & Culture',
  travel: 'Travel',
  style: 'Style',
  learning: 'Learning',
  investing: 'Investing',
  income: 'Income',
  transfers: 'Transfers',
  other: 'Other',
}

export const GROUP_COLOR: Record<string, string> = {
  food: '#f5b74a',
  transport: '#fbbf24',
  home: '#fb923c',
  subscriptions: '#a78bfa',
  health: '#fb7185',
  family: '#f472b6',
  gifts: '#f9a8d4',
  festivals: '#fde047',
  culture: '#c084fc',
  travel: '#38bdf8',
  style: '#e879f9',
  learning: '#34d399',
  investing: '#4ade80',
  income: '#86efac',
  transfers: '#94a3b8',
  other: '#a8a29e',
}
