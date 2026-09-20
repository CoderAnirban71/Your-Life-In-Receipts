import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const TITLE = 'EVERY RECEIPT REMEMBERS'

/**
 * The title card. A black screen, the title typed out like a receipt header, then
 * the curtain lifts on the desk. Skipped under reduced motion and after the first visit
 * in a session, so it never gets in the way twice.
 */
export function IntroCurtain() {
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    try {
      return !sessionStorage.getItem('intro-seen')
    } catch {
      return true
    }
  })
  const [chars, setChars] = useState(0)

  useEffect(() => {
    if (!show) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    let i = 0
    const type = window.setInterval(() => {
      i += 1
      setChars(i)
      if (i >= TITLE.length) window.clearInterval(type)
    }, 55)
    const done = window.setTimeout(() => dismiss(), TITLE.length * 55 + 1100)
    const onKey = () => dismiss()
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onKey, { passive: true })
    return () => {
      document.body.style.overflow = prev
      window.clearInterval(type)
      window.clearTimeout(done)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  const dismiss = () => {
    try {
      sessionStorage.setItem('intro-seen', '1')
    } catch {
      /* private mode */
    }
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-desk"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.9, ease: 'easeInOut' } }}
          onClick={dismiss}
          role="presentation"
        >
          <div className="text-center px-6">
            <div className="font-mono text-[clamp(13px,2.2vw,20px)] tracking-[0.42em] text-paper">
              {TITLE.slice(0, chars)}
              <span className="cursor-blink text-amber">▍</span>
            </div>
            <motion.div
              className="mt-6 font-serif italic text-fog text-[clamp(1rem,2vw,1.35rem)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: chars >= TITLE.length ? 1 : 0 }}
              transition={{ duration: 0.6 }}
            >
              a data story in four acts
            </motion.div>
            <motion.div
              className="mt-10 eyebrow"
              initial={{ opacity: 0 }}
              animate={{ opacity: chars >= TITLE.length ? 1 : 0 }}
              transition={{ delay: 0.3 }}
            >
              click · scroll · any key
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
