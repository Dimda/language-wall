import { type Element, IMPACT_MS, type Tier } from '../shared/types';

/**
 * Retro spell effects in the style of 16-bit JRPGs: everything is drawn on a low-resolution
 * canvas (1 pixel = SCALE screen pixels) with hard edges, small per-element palettes, and
 * stepped animation at FPS frames per second. Positions passed in are stage CSS pixels.
 */

const SCALE = 3;
const FPS = 12;
const FRAME_MS = 1000 / FPS;
const CHANT_MS = 700;

type Ctx = CanvasRenderingContext2D;

interface Pt {
  x: number;
  y: number;
}

interface Effect {
  start: number;
  dur: number;
  /** f = frame index since start, t = ms since start. */
  draw: (c: Ctx, f: number, t: number) => void;
}

const PALETTE: Record<Element, string[]> = {
  // light → dark
  fire: ['#fff8a0', '#ffc030', '#ff6a10', '#c02000'],
  ice: ['#ffffff', '#b8f0ff', '#4ab0ff', '#1a50c0'],
  thunder: ['#ffffff', '#ffff60', '#ffc000', '#a06000'],
  wind: ['#ffffff', '#b8ffb0', '#40d060', '#107030'],
  light: ['#ffffff', '#fff8c0', '#ffe060', '#c0a020'],
  shadow: ['#e0b0ff', '#a050e0', '#5a1a90', '#1a0828'],
};

function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

// ── pixel primitives (low-res coordinates) ──────────────

function px(c: Ctx, x: number, y: number, col: string) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), 1, 1);
}

function box(c: Ctx, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function disc(c: Ctx, cx: number, cy: number, r: number, col: string) {
  c.fillStyle = col;
  const R = Math.round(r);
  for (let y = -R; y <= R; y++) {
    const w = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
    c.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

function ring(c: Ctx, cx: number, cy: number, r: number, col: string) {
  const steps = Math.max(12, Math.round(r * 6));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    px(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, col);
  }
}

function line(c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, thick = 1) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const X = Math.round(x1);
  const Y = Math.round(y1);
  const dx = Math.abs(X - x);
  const dy = -Math.abs(Y - y);
  const sx = x < X ? 1 : -1;
  const sy = y < Y ? 1 : -1;
  let err = dx + dy;
  c.fillStyle = col;
  for (;;) {
    c.fillRect(x - Math.floor(thick / 2), y, thick, 1);
    if (x === X && y === Y) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/** Classic 4-point twinkle star. */
function star(c: Ctx, x: number, y: number, r: number, outer: string, core = '#ffffff') {
  const R = Math.max(1, Math.round(r));
  for (let i = 1; i <= R; i++) {
    px(c, x + i, y, outer);
    px(c, x - i, y, outer);
    px(c, x, y + i, outer);
    px(c, x, y - i, outer);
  }
  if (R >= 3) {
    px(c, x + 1, y + 1, outer);
    px(c, x - 1, y - 1, outer);
    px(c, x + 1, y - 1, outer);
    px(c, x - 1, y + 1, outer);
  }
  px(c, x, y, core);
}

function diamond(c: Ctx, cx: number, cy: number, r: number, pal: string[]) {
  const R = Math.round(r);
  for (let y = -R; y <= R; y++) {
    const w = R - Math.abs(y);
    for (let x = -w; x <= w; x++) {
      const edge = Math.abs(x) === w || Math.abs(y) === R;
      px(c, cx + x, cy + y, edge ? pal[3] : x < 0 && y < 0 ? pal[0] : x + y < 0 ? pal[1] : pal[2]);
    }
  }
}

/** Energy ball: dark rim, body, bright core and a highlight that spins; sputters when weak. */
function orb(c: Ctx, x: number, y: number, r: number, pal: string[], f: number, sputter: boolean) {
  const pulse = f % 2 ? 0.5 : 0;
  disc(c, x, y, r + 1 + pulse, pal[3]);
  disc(c, x, y, r + pulse, pal[2]);
  disc(c, x - r * 0.2, y - r * 0.2, r * 0.6, pal[1]);
  disc(c, x - r * 0.3, y - r * 0.3, Math.max(0.6, r * 0.25), pal[0]);
  const a = f * 1.3;
  if (!sputter || f % 2) px(c, x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), pal[0]);
  if (sputter && f % 3 === 0) px(c, x + r + 2, y - r, '#999999');
}

/** One flame tongue: wide hot base narrowing to a flickering tip. */
function flame(c: Ctx, x: number, baseY: number, h: number, w: number, pal: string[], seed: number) {
  const r = rng(seed);
  for (let row = 0; row < h; row++) {
    const k = row / h;
    const half = Math.max(0, Math.round(w * (1 - k) * (0.7 + 0.3 * Math.sin(k * 3.1)) + (r() - 0.5) * 2));
    const sway = Math.round(Math.sin(k * 4 + seed) * 1.5 * k);
    for (let dx = -half; dx <= half; dx++) {
      const edge = Math.abs(dx) >= half - 0;
      const col = k > 0.75 ? pal[3] : edge ? pal[2] : Math.abs(dx) < half * 0.4 && k < 0.5 ? pal[0] : pal[1];
      px(c, x + dx + sway, baseY - row, col);
    }
  }
}

function bolt(c: Ctx, x0: number, y0: number, x1: number, y1: number, pal: string[], seed: number) {
  const r = rng(seed);
  const segs = 7;
  let px0 = x0;
  let py0 = y0;
  for (let i = 1; i <= segs; i++) {
    const k = i / segs;
    const nx = i === segs ? x1 : x0 + (x1 - x0) * k + (r() - 0.5) * 14;
    const ny = y0 + (y1 - y0) * k;
    line(c, px0, py0, nx, ny, pal[2], 3);
    line(c, px0, py0, nx, ny, pal[0], 1);
    if (r() < 0.35) line(c, nx, ny, nx + (r() - 0.5) * 12, ny + 6, pal[1], 1);
    px0 = nx;
    py0 = ny;
  }
}

// ── engine ──────────────────────────────────────────────

export class SpellFX {
  private ctx: Ctx;
  private effects: Effect[] = [];
  private raf = 0;
  private lastFrame = -1;
  private w = 0;
  private h = 0;
  private flashes: { at: number; col: string }[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, Math.ceil(rect.width / SCALE));
    this.h = Math.max(1, Math.ceil(rect.height / SCALE));
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx.imageSmoothingEnabled = false;
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
  }

  private low(p: Pt): Pt {
    return { x: Math.round(p.x / SCALE), y: Math.round(p.y / SCALE) };
  }

  private add(dur: number, draw: Effect['draw'], delay = 0): void {
    this.effects.push({ start: performance.now() + delay, dur, draw });
    this.loop();
  }

  private flash(delay: number, col: string): void {
    this.flashes.push({ at: performance.now() + delay, col });
  }

  /** Twinkling star above a typing caster. */
  sparkle(p: Pt, color: string): void {
    const at = this.low(p);
    const ox = Math.round((Math.random() - 0.5) * 10);
    this.add(500, (c, f) => {
      const y = at.y - 4 - f * 2;
      star(c, at.x + ox, y, f % 2 === 0 ? 2 : 1, color);
    });
  }

  /**
   * One shared spell: sparks stream from every caster into a single energy ball, which is shot
   * at the boss and bursts in its element on impact. A fizzled spell's ball sputters and drops.
   */
  cast(casters: Pt[], target: Pt, element: Element, tier: Tier): void {
    const pal = PALETTE[element];
    const T = this.low(target);
    const C = casters.map((p) => this.low(p));
    const u = Math.max(1, this.w / 260);
    const cx = C.reduce((s, p) => s + p.x, 0) / Math.max(1, C.length);
    const G = { x: Math.round(cx - 14 * u), y: Math.round(Math.min(...C.map((p) => p.y), T.y + 20 * u) - 24 * u) };
    const R = (tier === 'perfect' ? 8 : tier === 'strong' ? 5.5 : tier === 'weak' ? 3.5 : 2.5) * u;

    // 1. gather: sparks fly from each caster into the ball, which grows
    this.add(CHANT_MS, (c, f, t) => {
      const p = t / CHANT_MS;
      for (const [ci, from] of C.entries()) {
        for (let i = 0; i < 3; i++) {
          const k = ((f + i * 2 + ci) % 6) / 6;
          const x = from.x + (G.x - from.x) * k;
          const y = from.y + (G.y - from.y) * k - Math.sin(k * Math.PI) * 6 * u;
          star(c, x, y, (f + i) % 2 ? 2 : 1, pal[1]);
        }
      }
      orb(c, G.x, G.y, Math.max(1, R * p), pal, f, tier === 'fizzle');
    });

    if (tier === 'fizzle') {
      this.fizzle(G, R, pal);
      return;
    }

    // 2. shoot: the ball flies to the target in stepped frames, leaving a trail
    const flight = IMPACT_MS - CHANT_MS;
    this.add(
      flight,
      (c, f, t) => {
        const steps = Math.ceil(flight / FRAME_MS);
        for (let back = 4; back >= 0; back--) {
          const k = Math.max(0, Math.min(1, (f - back) / steps));
          const x = G.x + (T.x - G.x) * k;
          const y = G.y + (T.y - G.y) * k - Math.sin(k * Math.PI) * 10 * u;
          if (back === 0) orb(c, x, y, R, pal, f, false);
          else star(c, x, y, Math.max(1, Math.round(R / 2) - back + 2), back > 2 ? pal[3] : pal[2], pal[1]);
        }
        if (tier === 'perfect') for (let i = 0; i < 3; i++) star(c, G.x + (T.x - G.x) * (t / flight) + (i - 1) * 6, G.y + (T.y - G.y) * (t / flight) - 8, 1, '#ffffff');
      },
      CHANT_MS,
    );

    // 3. impact: element burst at the target
    const k = tier === 'perfect' ? 1.45 : tier === 'strong' ? 1 : 0.6;
    const n = tier === 'perfect' ? 5 : tier === 'strong' ? 3 : 1;
    const draw = {
      fire: () => this.fire(T, pal, k, n, u, 0),
      ice: () => this.ice(T, pal, k, n, u, 0),
      thunder: () => this.thunder(T, pal, k, n, u, 0),
      wind: () => this.wind(T, pal, k, u),
      light: () => this.light(T, pal, k, n, u, 0),
      shadow: () => this.shadow(T, pal, k, n, u, 0),
    }[element]();
    this.add(1300, draw, IMPACT_MS);

    // radiating hit stars, plus flashes and a star burst for perfect
    this.add(
      500,
      (c, f) => {
        const count = tier === 'perfect' ? 10 : tier === 'strong' ? 6 : 3;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + 0.3;
          const d = (6 + f * 5) * u * k;
          star(c, T.x + Math.cos(a) * d, T.y + Math.sin(a) * d * 0.7, f < 3 ? 3 : 1, pal[1]);
        }
      },
      IMPACT_MS,
    );
    if (tier !== 'weak') this.flash(IMPACT_MS, pal[0]);
    if (tier === 'perfect') {
      this.flash(IMPACT_MS + FRAME_MS * 2, '#ffffff');
      this.flash(IMPACT_MS + FRAME_MS * 4, pal[1]);
      this.add(
        900,
        (c, f) => {
          const r = (f + 1) * 6 * u;
          ring(c, T.x, T.y, r, f % 2 ? '#ffffff' : pal[1]);
          ring(c, T.x, T.y, r * 0.6, pal[0]);
          star(c, T.x, T.y, Math.max(2, 10 * u - f), '#ffffff', pal[0]);
        },
        IMPACT_MS,
      );
    }
  }

  // ── element effects (each returns a draw fn; t is ms since the effect started) ──

  private fire(T: Pt, pal: string[], k: number, n: number, u: number, impact: number): Effect['draw'] {
    return (c, f, t) => {
      const grow = Math.min(1, t / impact);
      const fade = t > 1500 ? 1 - (t - 1500) / 400 : 1;
      const base = T.y + 16 * u;
      for (let i = 0; i < n; i++) {
        const x = T.x + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 44 * u * k);
        const h = Math.max(2, (t < impact ? 8 * grow : 26) * u * k * fade * (i % 2 ? 0.8 : 1));
        flame(c, x, base, h, 5 * u * k * Math.max(0.4, fade), pal, f * 7 + i * 13);
      }
      if (t >= impact && t < impact + 3 * FRAME_MS) {
        disc(c, T.x, T.y, (6 + (t - impact) / 25) * u * k, pal[0]);
        ring(c, T.x, T.y, (10 + (t - impact) / 20) * u * k, pal[2]);
      }
    };
  }

  private ice(T: Pt, pal: string[], k: number, n: number, u: number, impact: number): Effect['draw'] {
    const count = n + 3;
    return (c, f, t) => {
      if (t < impact) {
        const shown = Math.ceil((t / impact) * count);
        for (let i = 0; i < shown; i++) {
          const a = (i / count) * Math.PI * 2;
          diamond(c, T.x + Math.cos(a) * 16 * u * k, T.y + Math.sin(a) * 10 * u * k, Math.min(6, 2 + (f - i)) * u * k * 0.8, pal);
        }
        if (k > 1.2) diamond(c, T.x, T.y, ((t / impact) * 18 * u) | 0, pal);
      } else {
        // shatter: shards fly out and fall
        const s = (t - impact) / FRAME_MS;
        const r = rng(7);
        for (let i = 0; i < count * 3; i++) {
          const a = r() * Math.PI * 2;
          const v = (2 + r() * 3) * u * k;
          const x = T.x + Math.cos(a) * v * s;
          const y = T.y + Math.sin(a) * v * s + 0.4 * s * s;
          diamond(c, x, y, s < 6 ? 2 : 1, pal);
        }
      }
    };
  }

  private thunder(T: Pt, pal: string[], k: number, n: number, u: number, impact: number): Effect['draw'] {
    return (c, f, t) => {
      if (t < impact) {
        // crackle around the target
        const r = rng(f);
        for (let i = 0; i < 4; i++) px(c, T.x + (r() - 0.5) * 30 * u, T.y + (r() - 0.5) * 20 * u, pal[1]);
        return;
      }
      const s = Math.floor((t - impact) / FRAME_MS);
      if (s > 9 || s % 2 === 1) return; // flicker on/off
      for (let i = 0; i < n; i++) {
        const x = T.x + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 36 * u * k);
        bolt(c, x + (i - n / 2) * 4, 0, T.x + (i - n / 2) * 3 * u, T.y, pal, f * 3 + i);
      }
      disc(c, T.x, T.y, 5 * u * k, pal[0]);
    };
  }

  private wind(T: Pt, pal: string[], k: number, u: number): Effect['draw'] {
    return (c, f, t) => {
      const life = Math.min(1, t / 250) * (t > 1000 ? Math.max(0, 1 - (t - 1000) / 300) : 1);
      const H = 46 * u * k * life;
      const bottom = T.y + 20 * u;
      for (let row = 0; row < H; row++) {
        const rr = (3 + (row / Math.max(1, H)) * 18) * u * k;
        const y = bottom - row;
        for (let d = 0; d < 5; d++) {
          const a = f * 1.1 + row * 0.22 + (d * Math.PI * 2) / 5;
          const front = Math.sin(a) > 0;
          const x = T.x + Math.cos(a) * rr;
          box(c, x, y, 3, 1, front ? (d % 2 ? pal[0] : pal[1]) : pal[3]);
        }
      }
      // leaves caught in the wind
      for (let i = 0; i < 8; i++) {
        const a = f * 0.8 + i * 0.8;
        const y = bottom - ((f * 4 + i * 11) % Math.max(1, H));
        box(c, T.x + Math.cos(a) * 20 * u * k, y, 2, 2, i % 2 ? pal[2] : '#e8c040');
      }
    };
  }

  private light(T: Pt, pal: string[], k: number, n: number, u: number, impact: number): Effect['draw'] {
    return (c, f, t) => {
      const drop = Math.min(1, (t - impact + 300) / 300);
      if (drop <= 0) return;
      const fade = t > 1500 ? 1 - (t - 1500) / 400 : 1;
      for (let i = 0; i < n; i++) {
        const x = T.x + (n === 1 ? 0 : (i / (n - 1) - 0.5) * 40 * u * k);
        const w = Math.max(1, Math.round(4 * u * k * fade));
        const bottom = T.y + 14 * u;
        const top = bottom - (bottom + 4) * drop;
        box(c, x - w - 1, top, w * 2 + 3, bottom - top, pal[2]);
        box(c, x - w, top, w * 2 + 1, bottom - top, pal[1]);
        box(c, x - Math.floor(w / 2), top, w + 1, bottom - top, pal[0]);
      }
      const r = rng(f);
      for (let i = 0; i < 5; i++) star(c, T.x + (r() - 0.5) * 50 * u, T.y + (r() - 0.5) * 30 * u, 2, pal[2]);
    };
  }

  private shadow(T: Pt, pal: string[], k: number, n: number, u: number, impact: number): Effect['draw'] {
    const orbs = n + 2;
    return (c, f, t) => {
      if (t < impact) {
        const p = t / impact;
        for (let i = 0; i < orbs; i++) {
          const a = (i / orbs) * Math.PI * 2 + p * 4;
          const d = (1 - p) * 34 * u;
          const x = T.x + Math.cos(a) * d;
          const y = T.y + Math.sin(a) * d * 0.7;
          disc(c, x, y, 3 * u * k, pal[2]);
          disc(c, x, y, 1.5 * u * k, pal[3]);
          px(c, x - 1, y - 1, pal[0]);
        }
      } else {
        const s = (t - impact) / FRAME_MS;
        if (s < 8) {
          disc(c, T.x, T.y, (4 + s * 3) * u * k, s % 2 ? pal[3] : pal[2]);
          ring(c, T.x, T.y, (6 + s * 4) * u * k, pal[1]);
          ring(c, T.x, T.y, (8 + s * 5) * u * k, pal[0]);
        }
      }
    };
  }

  private fizzle(G: Pt, R: number, pal: string[]): void {
    const smoke = ['#bbbbbb', '#888888', '#555555'];
    const ground = G.y + 34;
    this.add(
      1800,
      (c, f) => {
        if (f < 5) {
          // the ball wobbles and flickers grey
          orb(c, G.x + (f % 2 ? 1 : -1), G.y, Math.max(1, R - f * 0.3), f % 2 ? pal : ['#dddddd', '#999999', '#666666', '#333333'], f, true);
        } else if (f < 10) {
          // drops to the ground
          const s = f - 5;
          orb(c, G.x, Math.min(ground, G.y + s * s * 1.6), Math.max(1, R * 0.6), ['#cccccc', '#999999', '#666666', '#333333'], f, true);
        } else {
          const s = f - 10;
          for (let i = 0; i < 4; i++) {
            const a = i * 1.6;
            disc(c, G.x + Math.cos(a) * (2 + s), ground - s * 1.2 + Math.sin(a) * 2, Math.max(1, 3 - s / 4), smoke[Math.min(2, Math.floor(s / 4))]);
          }
        }
      },
      CHANT_MS,
    );
  }

  // ── loop ──

  private loop(): void {
    if (this.raf) return;
    const tick = (now: number) => {
      const frame = Math.floor(now / FRAME_MS);
      if (frame !== this.lastFrame) {
        this.lastFrame = frame;
        this.render(now);
      }
      if (this.effects.length || this.flashes.length) {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.raf = 0;
        this.ctx.clearRect(0, 0, this.w, this.h);
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  private render(now: number): void {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    this.effects = this.effects.filter((e) => now < e.start + e.dur);
    for (const e of this.effects) {
      const t = now - e.start;
      if (t < 0) continue;
      e.draw(c, Math.floor(t / FRAME_MS), t);
    }
    // palette flashes last exactly one frame each
    this.flashes = this.flashes.filter((fl) => now < fl.at + FRAME_MS * 1.5);
    for (const fl of this.flashes) {
      if (now >= fl.at) {
        c.globalAlpha = 0.45;
        box(c, 0, 0, this.w, this.h, fl.col);
        c.globalAlpha = 1;
      }
    }
  }
}
