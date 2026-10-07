/**
 * Tiny procedural chiptune engine (Web Audio). All music is original and generated in code:
 * square/triangle oscillators + a noise channel, scheduled with a look-ahead clock.
 */

type Wave = 'square' | 'triangle' | 'sawtooth' | 'sine';

interface NoteEvent {
  step: number;
  midi: number;
  len: number;
}

interface Voice {
  wave: Wave;
  gain: number;
  events: NoteEvent[];
  /** Square duty-ish detune for a fatter sound. */
  detune?: number;
}

interface DrumVoice {
  gain: number;
  hits: { step: number; kind: 'k' | 's' | 'h' }[];
}

interface Track {
  bpm: number;
  steps: number;
  voices: Voice[];
  drums?: DrumVoice;
  loop: boolean;
}

export type TrackName = 'menu' | 'battle' | 'quiet' | 'victory' | 'defeat';

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midiOf(tok: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(tok);
  if (!m) throw new Error(`bad note ${tok}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + acc;
}

/** "A4 - C5 . E5" → note events; "-" holds the previous note, "." is a rest. Bars "|" are ignored. */
function seq(src: string): NoteEvent[] {
  const out: NoteEvent[] = [];
  let step = 0;
  for (const tok of src.split(/\s+/).filter((t) => t && t !== '|')) {
    if (tok === '-') {
      if (out.length) out[out.length - 1].len++;
    } else if (tok !== '.') {
      out.push({ step, midi: midiOf(tok), len: 1 });
    }
    step++;
  }
  return out;
}

function drums(src: string): DrumVoice['hits'] {
  return src
    .replace(/\|/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((tok, step) => (tok === '.' ? [] : [...tok].map((k) => ({ step, kind: k as 'k' | 's' | 'h' }))));
}

const rep = (s: string, n: number) => Array(n).fill(s).join(' ');

const TRACKS: Record<TrackName, Track> = {
  // Calm, warm menu theme — C major, gentle arpeggios.
  menu: {
    bpm: 84,
    steps: 64,
    loop: true,
    voices: [
      {
        wave: 'square',
        gain: 0.05,
        events: seq(`
          E5 - - - D5 - C5 - D5 - - - G4 - - - |
          A4 - - - C5 - E5 - D5 - - - - - - - |
          F5 - - - E5 - D5 - C5 - - - A4 - - - |
          B4 - - - D5 - G5 - E5 - - - - - . .`),
      },
      {
        wave: 'triangle',
        gain: 0.09,
        events: seq(`
          ${rep('C4 E4 G4 E4', 4)} | ${rep('A3 C4 E4 C4', 4)} |
          ${rep('F3 A3 C4 A3', 4)} | ${rep('G3 B3 D4 B3', 4)}`),
      },
      {
        wave: 'triangle',
        gain: 0.12,
        events: seq(`C3 - - - - - - - C3 - - - G2 - - - | A2 - - - - - - - A2 - - - E2 - - - |
          F2 - - - - - - - F2 - - - C3 - - - | G2 - - - - - - - G2 - - - D3 - - -`),
      },
    ],
  },
  // Driving battle loop — A minor, 16th-note octave bass, urgent lead.
  battle: {
    bpm: 152,
    steps: 64,
    loop: true,
    voices: [
      {
        wave: 'square',
        gain: 0.045,
        detune: 6,
        events: seq(`
          A4 . C5 . E5 . A5 - G5 . E5 . C5 . D5 . |
          E5 - - . D5 . C5 . B4 . C5 . A4 - - - |
          F5 . E5 . D5 . C5 . D5 - - . A4 . C5 . |
          B4 . D5 . G5 - - . F5 . E5 . G#5 - - -`),
      },
      {
        wave: 'square',
        gain: 0.035,
        events: seq(`${rep('A2 A3', 8)} | ${rep('A2 A3', 8)} | ${rep('F2 F3', 8)} | ${rep('E2 E3', 8)}`),
      },
      {
        wave: 'triangle',
        gain: 0.06,
        events: seq(`${rep('E4 A4 C5 A4', 4)} | ${rep('E4 G4 C5 G4', 4)} | ${rep('F4 A4 C5 A4', 4)} | ${rep('E4 G#4 B4 G#4', 4)}`),
      },
    ],
    drums: {
      gain: 0.22,
      hits: drums(rep('k . h . s . h k k . h . s . h h', 4)),
    },
  },
  // Near-silent tension pad for resolving spells.
  quiet: {
    bpm: 60,
    steps: 32,
    loop: true,
    voices: [
      {
        wave: 'triangle',
        gain: 0.05,
        events: seq(`A2 - - - - - - - - - - - - - - - F2 - - - - - - - E2 - - - - - - -`),
      },
      {
        wave: 'sine',
        gain: 0.03,
        events: seq(`. . E4 - - - - - . . C4 - - - - - . . D4 - - - - - . . B3 - - - - -`),
      },
    ],
  },
  victory: {
    bpm: 140,
    steps: 40,
    loop: false,
    voices: [
      { wave: 'square', gain: 0.06, events: seq('G4 . C5 . E5 . G5 - - . E5 . G5 - - . C6 - - - - - - - - - - - . . . . . . . . . . . . .') },
      { wave: 'triangle', gain: 0.1, events: seq('C3 . . . C3 . . . C3 . . . C3 . . . C3 - - - - - - - - - - - . . . . . . . . . . . . .') },
      { wave: 'square', gain: 0.035, events: seq('E4 . G4 . C5 . E5 - - . C5 . E5 - - . G5 - - - - - - - - - - - . . . . . . . . . . . . .') },
    ],
  },
  defeat: {
    bpm: 70,
    steps: 32,
    loop: false,
    voices: [
      { wave: 'square', gain: 0.05, events: seq('E4 - D4 - C4 - B3 - - - A3 - - - - - G#3 - - - - - - - . . . . . . . .') },
      { wave: 'triangle', gain: 0.1, events: seq('A2 - - - - - - - F2 - - - - - - - E2 - - - - - - - . . . . . . . .') },
    ],
  },
};

const freq = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

class Engine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private noise!: AudioBuffer;
  private current: { name: TrackName; track: Track; bus: GainNode; step: number; time: number } | null = null;
  private wanted: TrackName | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('lw-muted') === '1';
    } catch {}
  }

  /** Must be called from a user gesture. */
  unlock(): void {
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.timer = setInterval(() => this.tick(), 25);
      if (this.wanted) this.play(this.wanted);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    try {
      localStorage.setItem('lw-muted', m ? '1' : '0');
    } catch {}
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  play(name: TrackName | null): void {
    if (this.current?.name === name && this.current.track.loop) return;
    this.wanted = name;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.current) {
      const old = this.current.bus;
      old.gain.setTargetAtTime(0, now, 0.15);
      setTimeout(() => old.disconnect(), 1200);
      this.current = null;
    }
    if (!name) return;
    const bus = this.ctx.createGain();
    bus.gain.value = 0;
    bus.gain.setTargetAtTime(1, now, 0.1);
    bus.connect(this.master);
    this.current = { name, track: TRACKS[name], bus, step: 0, time: now + 0.05 };
  }

  private tick(): void {
    const ctx = this.ctx;
    const cur = this.current;
    if (!ctx || !cur) return;
    const stepDur = 60 / cur.track.bpm / 4;
    while (cur.time < ctx.currentTime + 0.12) {
      if (cur.step >= cur.track.steps) {
        if (!cur.track.loop) {
          this.current = null;
          return;
        }
        cur.step = 0;
      }
      for (const v of cur.track.voices) {
        for (const e of v.events) {
          if (e.step === cur.step) this.tone(cur.bus, v.wave, freq(e.midi), cur.time, e.len * stepDur, v.gain, v.detune);
        }
      }
      for (const h of cur.track.drums?.hits ?? []) {
        if (h.step === cur.step) this.drum(cur.bus, h.kind, cur.time, cur.track.drums!.gain);
      }
      cur.step++;
      cur.time += stepDur;
    }
  }

  private tone(out: AudioNode, wave: Wave, hz: number, t: number, dur: number, gain: number, detune = 0): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.setValueAtTime(gain, t + Math.max(0.01, dur - 0.04));
    g.gain.linearRampToValueAtTime(0, t + dur);
    g.connect(out);
    const oscs = detune ? [-detune, detune] : [0];
    for (const d of oscs) {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.value = hz;
      o.detune.value = d;
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
  }

  private drum(out: AudioNode, kind: 'k' | 's' | 'h', t: number, gain: number): void {
    const ctx = this.ctx!;
    if (kind === 'k') {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(gain * 1.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.16);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = kind === 's' ? 'bandpass' : 'highpass';
    f.frequency.value = kind === 's' ? 1800 : 7000;
    const g = ctx.createGain();
    const len = kind === 's' ? 0.12 : 0.04;
    g.gain.setValueAtTime(gain * (kind === 's' ? 0.9 : 0.35), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + len);
    src.connect(f).connect(g).connect(out);
    src.start(t);
    src.stop(t + len + 0.01);
  }

  // ── sound effects ─────────────────────────────────────

  private sweep(wave: Wave, from: number, to: number, dur: number, gain: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(dur: number, gain: number, cutoff: number, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(100, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  sfx(kind: 'blip' | 'select' | 'charge' | 'hit' | 'crit' | 'fizzle' | 'boss' | 'judge' | 'submit' | 'crumble'): void {
    if (!this.ctx) return;
    switch (kind) {
      case 'blip':
        this.sweep('square', 880, 880, 0.03, 0.04);
        break;
      case 'select':
        this.sweep('square', 660, 990, 0.08, 0.06);
        break;
      case 'submit':
        this.sweep('square', 523, 1046, 0.12, 0.06);
        this.sweep('square', 784, 1568, 0.12, 0.04, 0.06);
        break;
      case 'judge':
        for (let i = 0; i < 6; i++) this.sweep('square', 300 + i * 60, 300 + i * 60, 0.05, 0.04, i * 0.12);
        break;
      case 'charge':
        this.sweep('triangle', 200, 1200, 0.9, 0.12);
        this.sweep('square', 100, 600, 0.9, 0.03);
        break;
      case 'hit':
        this.burst(0.35, 0.5, 3000);
        this.sweep('square', 400, 60, 0.25, 0.08);
        break;
      case 'crit':
        this.burst(0.9, 0.7, 6000);
        [523, 659, 784, 1046, 1318].forEach((hz, i) => this.sweep('square', hz, hz, 0.12, 0.07, i * 0.06));
        this.sweep('sawtooth', 80, 30, 0.8, 0.15);
        break;
      case 'fizzle':
        this.sweep('square', 600, 90, 0.7, 0.06);
        this.burst(0.4, 0.15, 800, 0.5);
        break;
      case 'boss':
        this.burst(0.8, 0.6, 1200);
        this.sweep('sawtooth', 120, 35, 0.7, 0.18);
        break;
      case 'crumble':
        // death throes rumble, then the wall bursts and rubble rains down
        for (let i = 0; i < 6; i++) this.burst(0.25, 0.35, 600, i * 0.2);
        this.sweep('sawtooth', 90, 40, 1.2, 0.12);
        this.burst(1.6, 0.9, 5000, 1.2);
        this.sweep('square', 200, 30, 1.0, 0.15, 1.2);
        for (let i = 0; i < 10; i++) this.sweep('square', 300 + ((i * 97) % 400), 80, 0.12, 0.05, 1.4 + i * 0.12);
        break;
    }
  }
}

export const audio = new Engine();
