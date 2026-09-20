import { useEffect, useState } from 'react'
import { motion, useScroll, useSpring } from 'motion/react'
import { scrollToAct, useStory, type ActId } from '../lib/store'
import { sound } from '../lib/sound'

const ACTS: { id: ActId; label: string }[] = [
  { id: 'hook', label: 'I · Receipt' },
  { id: 'river', label: 'II · River' },
  { id: 'threads', label: 'III · Threads' },
  { id: 'roll', label: 'IV · Roll' },
]

export function Nav() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 })
  const [active, setActive] = useState<ActId>('hook')
  const fx = useStory((s) => s.fx)
  const toggleFx = useStory((s) => s.toggleFx)
  const snd = useStory((s) => s.sound)
  const toggleSound = useStory((s) => s.toggleSound)

  const onSound = () => {
    if (snd) sound.disable()
    else void sound.enable()
    toggleSound()
  }

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id.replace('act-', '') as ActId)
      },
      { rootMargin: '-40% 0px -55% 0px' },
    )
    // acts III + IV are lazy-loaded, so keep looking until every act is in the DOM
    const seen = new Set<string>()
    const attach = () => {
      for (const a of ACTS) {
        const el = document.getElementById(`act-${a.id}`)
        if (el && !seen.has(a.id)) {
          seen.add(a.id)
          io.observe(el)
        }
      }
      if (seen.size < ACTS.length) timer = window.setTimeout(attach, 400)
    }
    let timer = 0
    attach()
    return () => {
      window.clearTimeout(timer)
      io.disconnect()
    }
  }, [])

  return (
    <nav aria-label="Acts" className="fixed inset-x-0 top-0 z-40 border-b border-line bg-desk/70 backdrop-blur-md">
      <motion.div className="absolute inset-x-0 top-0 h-[2px] origin-left bg-gradient-to-r from-amber to-teal" style={{ scaleX: progress }} aria-hidden />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <button onClick={() => scrollToAct('hook')} className="font-mono text-[11px] tracking-[0.22em] text-paper">
          EVERY RECEIPT <span className="text-amber">REMEMBERS</span>
        </button>
        <ul className="flex items-center gap-1 sm:gap-2">
          <li className="mr-1 flex items-center gap-1 border-r border-line pr-2 sm:mr-2 sm:pr-3">
            <button
              onClick={onSound}
              aria-pressed={snd}
              title={snd ? 'Sound on — click to mute' : 'Sound off — synthesized room tone + printer'}
              className={`rounded-full px-2 py-1 font-mono text-[10px] tracking-[0.12em] transition ${snd ? 'bg-teal/20 text-teal' : 'text-fog-2 hover:text-paper'}`}
            >
              {snd ? '♪ ON' : '♪ OFF'}
            </button>
            <button
              onClick={toggleFx}
              aria-pressed={fx}
              title={fx ? 'Cinematic effects on (bloom, grain) — click for the light render path' : 'Effects off — click for the full film look'}
              className={`rounded-full px-2 py-1 font-mono text-[10px] tracking-[0.12em] transition ${fx ? 'bg-amber/20 text-amber' : 'text-fog-2 hover:text-paper'}`}
            >
              FX
            </button>
          </li>
          {ACTS.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => scrollToAct(a.id)}
                aria-current={active === a.id ? 'true' : undefined}
                className={`rounded-full px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] transition sm:px-3 ${
                  active === a.id ? 'bg-paper text-ink' : 'text-fog hover:text-paper'
                }`}
              >
                <span className="sm:hidden">{a.label.split(' · ')[0]}</span>
                <span className="hidden sm:inline">{a.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
