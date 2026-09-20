/**
 * A tiny synthesized soundtrack — no audio files. Off by default; the nav toggle
 * turns it on. Ambience is filtered brown noise with a slow swell (a room at night);
 * the printer ticks are short filtered noise bursts fired per printed line.
 */
let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambience: { src: AudioBufferSourceNode; gain: GainNode; lfo: OscillatorNode } | null = null

function ensure(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
  }
  return ctx
}

function brownNoise(ac: AudioContext, seconds = 4): AudioBuffer {
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    d[i] = last * 3.5
  }
  return buf
}

export const sound = {
  enabled: false,

  async enable() {
    const ac = ensure()
    if (ac.state === 'suspended') await ac.resume()
    if (!ambience) {
      const src = ac.createBufferSource()
      src.buffer = brownNoise(ac)
      src.loop = true
      const lp = ac.createBiquadFilter()
      lp.type = 'lowpass'
      lp.frequency.value = 160
      const gain = ac.createGain()
      gain.gain.value = 0.35
      // slow swell so the room breathes
      const lfo = ac.createOscillator()
      lfo.frequency.value = 0.07
      const lfoGain = ac.createGain()
      lfoGain.gain.value = 0.12
      lfo.connect(lfoGain).connect(gain.gain)
      src.connect(lp).connect(gain).connect(master!)
      src.start()
      lfo.start()
      ambience = { src, gain, lfo }
    }
    master!.gain.cancelScheduledValues(ac.currentTime)
    master!.gain.linearRampToValueAtTime(0.9, ac.currentTime + 1.2)
    this.enabled = true
  },

  disable() {
    if (!ctx || !master) return
    master.gain.cancelScheduledValues(ctx.currentTime)
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
    this.enabled = false
  },

  /** one thermal-printer step */
  tick() {
    if (!this.enabled || !ctx || !master) return
    const ac = ctx
    const len = 0.03
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * len), ac.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const src = ac.createBufferSource()
    src.buffer = buf
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2600 + Math.random() * 600
    bp.Q.value = 2.5
    const g = ac.createGain()
    g.gain.value = 0.16
    src.connect(bp).connect(g).connect(master)
    src.start()
  },

  /** a soft chime when a chapter turns to face the camera */
  chime(note = 0) {
    if (!this.enabled || !ctx || !master) return
    const ac = ctx
    const o = ac.createOscillator()
    o.type = 'sine'
    o.frequency.value = 440 * Math.pow(2, (note % 7) / 12 + 0.5)
    const g = ac.createGain()
    g.gain.setValueAtTime(0, ac.currentTime)
    g.gain.linearRampToValueAtTime(0.05, ac.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0005, ac.currentTime + 1.4)
    o.connect(g).connect(master)
    o.start()
    o.stop(ac.currentTime + 1.5)
  },
}
