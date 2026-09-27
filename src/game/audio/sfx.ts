/**
 * Every sound is synthesised with WebAudio — no audio files to download.
 * The context is created on the first user gesture (browsers require it).
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambience: { src: AudioBufferSourceNode; gain: GainNode } | null = null
let noiseBuf: AudioBuffer | null = null
let enabled = true

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = enabled ? 0.8 : 0
    master.connect(ctx.destination)
  }
  return ctx
}

function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    let last = 0
    for (let i = 0; i < d.length; i++) {
      // Brown-ish noise: softer, more like water than white hiss.
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      d[i] = last * 3.5
    }
  }
  return noiseBuf
}

function env(g: GainNode, t: number, attack: number, peak: number, release: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release)
}

function tone(freq: number, dur: number, type: OscillatorType, peak: number, when = 0, slideTo?: number) {
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime + when
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  env(g, t, 0.01, peak, dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.05)
}

function burst(freq: number, q: number, dur: number, peak: number, when = 0) {
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime + when
  const src = c.createBufferSource()
  src.buffer = noise(c)
  const f = c.createBiquadFilter()
  f.type = "bandpass"
  f.frequency.value = freq
  f.Q.value = q
  const g = c.createGain()
  env(g, t, 0.01, peak, dur)
  src.connect(f).connect(g).connect(master)
  src.start(t, Math.random())
  src.stop(t + dur + 0.05)
}

function quack(pitch = 1, when = 0) {
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime + when
  const o = c.createOscillator()
  o.type = "sawtooth"
  o.frequency.setValueAtTime(520 * pitch, t)
  o.frequency.exponentialRampToValueAtTime(330 * pitch, t + 0.14)
  const f = c.createBiquadFilter()
  f.type = "bandpass"
  f.frequency.value = 1100 * pitch
  f.Q.value = 3
  const g = c.createGain()
  env(g, t, 0.012, 0.25, 0.14)
  o.connect(f).connect(g).connect(master)
  o.start(t)
  o.stop(t + 0.2)
}

export const sfx = {
  /** Call from a click/tap handler to unlock audio on iOS/Safari. */
  unlock() {
    const c = audio()
    if (c && c.state === "suspended") void c.resume()
  },

  setEnabled(on: boolean) {
    enabled = on
    if (master && ctx) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05)
  },

  startAmbience() {
    const c = audio()
    if (!c || !master || ambience) return
    const src = c.createBufferSource()
    src.buffer = noise(c)
    src.loop = true
    const f = c.createBiquadFilter()
    f.type = "lowpass"
    f.frequency.value = 520
    const g = c.createGain()
    g.gain.value = 0
    g.gain.setTargetAtTime(0.22, c.currentTime, 1.2)
    src.connect(f).connect(g).connect(master)
    src.start()
    ambience = { src, gain: g }
  },

  stopAmbience() {
    if (!ambience || !ctx) return
    const { src, gain } = ambience
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4)
    src.stop(ctx.currentTime + 2)
    ambience = null
  },

  stroke() {
    burst(900 + Math.random() * 300, 0.9, 0.22, 0.2)
  },
  pickup(golden: boolean, trail: number) {
    quack(golden ? 1.35 : 1 + Math.min(trail, 12) * 0.02)
    tone(golden ? 1320 : 880 + Math.min(trail, 12) * 30, 0.16, "sine", 0.12, 0.05)
    if (golden) tone(1760, 0.3, "sine", 0.1, 0.14)
  },
  deliver(count: number) {
    const notes = [523, 659, 784, 1047]
    notes.forEach((n, i) => tone(n, 0.28, "triangle", 0.2, i * 0.09))
    for (let i = 0; i < Math.min(count, 6); i++) quack(1.1 + i * 0.05, 0.35 + i * 0.07)
  },
  scatter() {
    ;[1.2, 1.05, 0.9].forEach((p, i) => quack(p, i * 0.08))
  },
  bump(strength: number) {
    tone(110, 0.25, "sine", Math.min(0.5, 0.1 + strength * 0.06), 0, 55)
    burst(300, 0.7, 0.2, Math.min(0.3, strength * 0.05))
  },
  discover() {
    tone(784, 0.6, "sine", 0.15)
    tone(1175, 0.8, "sine", 0.1, 0.12)
  },
  golden() {
    ;[1047, 1319, 1568, 2093].forEach((n, i) => tone(n, 0.25, "sine", 0.1, i * 0.07))
  },
  tick() {
    tone(1000, 0.06, "square", 0.05)
  },
  end() {
    ;[784, 659, 523, 392].forEach((n, i) => tone(n, 0.5, "triangle", 0.16, i * 0.16))
  },
  click() {
    tone(660, 0.05, "triangle", 0.08)
  },
}
