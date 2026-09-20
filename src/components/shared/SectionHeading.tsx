import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface Props {
  act: string
  title: ReactNode
  lede?: ReactNode
  align?: 'left' | 'center'
}

export function SectionHeading({ act, title, lede, align = 'left' }: Props) {
  const a = align === 'center' ? 'text-center items-center' : ''
  return (
    <motion.header
      className={`flex flex-col gap-3 mb-10 ${a}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-15% 0px' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="eyebrow">{act}</span>
      <h2 className="font-serif font-medium text-[clamp(2rem,5vw,3.6rem)] leading-[1.05] tracking-tight text-paper">
        {title}
      </h2>
      {lede && <p className="prose-story max-w-[62ch]">{lede}</p>}
    </motion.header>
  )
}
