import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  /** narrow strips read as thermal paper; wide ones as an A4 statement */
  width?: 'narrow' | 'wide'
  tear?: boolean
  as?: 'div' | 'article' | 'section'
}

/** A piece of thermal-printer paper. The whole app's visual identity lives here. */
export function ReceiptStrip({ children, className = '', width = 'narrow', tear = true, as = 'div' }: Props) {
  const Tag = as
  const w = width === 'narrow' ? 'max-w-[380px]' : 'max-w-[720px]'
  return (
    <Tag className={`receipt w-full min-w-0 ${w} px-5 py-7 sm:px-8 ${className}`}>
      {tear && <span aria-hidden className="receipt-tear-top" />}
      {children}
      {tear && <span aria-hidden className="receipt-tear-bottom" />}
    </Tag>
  )
}

export function ReceiptRule() {
  return <hr className="receipt-rule" />
}

export function ReceiptLine({
  left,
  right,
  muted,
  className = '',
}: {
  left: ReactNode
  right?: ReactNode
  muted?: boolean
  className?: string
}) {
  return (
    <div className={`receipt-line ${muted ? 'text-ink-2' : ''} ${className}`}>
      <span className="dots">{left}</span>
      {right !== undefined && <span className="tabular-nums whitespace-nowrap">{right}</span>}
    </div>
  )
}

export function ReceiptHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="text-center mb-3">
      <div className="font-bold tracking-[0.2em] text-[13px] uppercase">{title}</div>
      {sub && <div className="text-[11px] text-ink-2 mt-1 tracking-wider">{sub}</div>}
    </div>
  )
}
