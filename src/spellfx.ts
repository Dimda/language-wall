import { IMPACT_MS, type Tier } from '../shared/types';

/**
 * Canvas particle engine for spells. Chunky square particles + additive blending to stay
 * "16-bit". Positions are canvas-relative CSS pixels.
 */

interface Pt {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
}

interface Spell {
  start: number;
  casters: Pt[];
  target: Pt;
  gather: Pt;
  color: string;
  tier: Tier;
  impacted: boolean;
}

const CHARGE_MS = 700;

export class SpellFX {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private spells: Spell[] = [];
  private rings: { x: number; y: number; r: number; max: number; color: string; born: number }[] = [];
  private flashUntil = 0;
  private flashColor = '#fff';
  private raf = 0;
  private w = 0;
  private h = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
  }

  cast(casters: Pt[], target: Pt, color: string, tier: Tier): void {
    const cx = casters.reduce((s, p) => s + p.x, 0) / Math.max(1, casters.length);
    const gather = { x: (cx + target.x) / 2 + 30, y: Math.min(target.y, ...casters.map((c) => c.y)) - 40 };
    this.spells.push({ start: performance.now(), casters, target, gather, color, tier, impacted: false });
    this.loop();
  }

  /** Small sparkle around a typing caster. */
  sparkle(p: Pt, color: string): void {
    for (let i = 0; i < 2; i++) {
      this.emit(p.x + (Math.random() - 0.5) * 30, p.y + 10, (Math.random() - 0.5) * 0.3, -0.8 - Math.random(), 700, 3, color, -0.0005);
    }
    this.loop();
  }

  private emit(x: number, y: number, vx: number, vy: number, max: number, size: number, color: string, gravity = 0): void {
    this.particles.push({ x, y, vx, vy, life: 0, max, size, color, gravity });
  }

  private burst(p: Pt, n: number, speed: number, colors: string[], size: number, max: number, gravity = 0.004): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random());
      this.emit(p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, max * (0.6 + Math.random() * 0.6), size, colors[i % colors.length], gravity);
    }
  }

  private loop = (): void => {
    if (this.raf) return;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      this.update(now, dt);
      this.draw(now);
      if (this.particles.length || this.spells.length || this.rings.length || now < this.flashUntil) {
        this.raf = requestAnimationFrame(frame);
      } else {
        this.raf = 0;
        this.ctx.clearRect(0, 0, this.w, this.h);
      }
    };
    this.raf = requestAnimationFrame(frame);
  };

  private update(now: number, dt: number): void {
    for (const s of this.spells) {
      const t = now - s.start;
      // Charge: streams of orbs from each caster towards the gather point.
      if (t < CHARGE_MS) {
        for (const c of s.casters) {
          const k = Math.random();
          const x = c.x + (s.gather.x - c.x) * k;
          const y = c.y + (s.gather.y - c.y) * k;
          this.emit(x, y, (s.gather.x - c.x) * 0.002, (s.gather.y - c.y) * 0.002, 400, 4, s.color);
        }
      } else if (t < IMPACT_MS) {
        const k = (t - CHARGE_MS) / (IMPACT_MS - CHARGE_MS);
        if (s.tier === 'fizzle') {
          // Orb wobbles, sputters and drops.
          const x = s.gather.x + Math.sin(t / 30) * 6 * k;
          const y = s.gather.y + k * k * 60;
          this.emit(x, y, (Math.random() - 0.5) * 0.2, -0.05, 300, 4 * (1 - k) + 2, k > 0.5 ? '#777' : s.color);
        } else {
          const ease = k * k;
          const x = s.gather.x + (s.target.x - s.gather.x) * ease;
          const y = s.gather.y + (s.target.y - s.gather.y) * ease;
          const size = s.tier === 'perfect' ? 10 : s.tier === 'strong' ? 7 : 4;
          for (let i = 0; i < (s.tier === 'weak' ? 1 : 3); i++) {
            this.emit(x + (Math.random() - 0.5) * size, y + (Math.random() - 0.5) * size, 0, 0, 350, size, s.color);
          }
          if (s.tier === 'perfect') this.emit(x, y, 0, 0, 500, 6, `hsl(${(t / 2) % 360} 100% 70%)`);
        }
      } else if (!s.impacted) {
        s.impacted = true;
        this.impact(s, now);
      }
    }
    this.spells = this.spells.filter((s) => now - s.start < IMPACT_MS + 100);

    for (const p of this.particles) {
      p.life += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    this.rings = this.rings.filter((r) => now - r.born < 700);
  }

  private impact(s: Spell, now: number): void {
    const { target, color } = s;
    switch (s.tier) {
      case 'perfect': {
        const rainbow = ['#ff4a5a', '#ffb84a', '#ffe84a', '#6aff9a', '#6ad8ff', '#c07aff', '#ffffff'];
        this.burst(target, 260, 0.55, rainbow, 6, 1600, 0.0006);
        this.burst(target, 80, 0.25, ['#fff'], 4, 1200, 0);
        for (let i = 0; i < 4; i++) this.rings.push({ ...target, r: 0, max: 120 + i * 70, color: rainbow[i * 2], born: now + i * 90 });
        this.flashUntil = now + 260;
        this.flashColor = '#ffffff';
        // Lingering light pillars.
        for (let i = 0; i < 40; i++) {
          this.emit(target.x + (Math.random() - 0.5) * 140, target.y + 60, 0, -0.25 - Math.random() * 0.3, 1400, 5, rainbow[i % 7], 0);
        }
        break;
      }
      case 'strong':
        this.burst(target, 110, 0.38, [color, '#ffffff', color], 5, 1000);
        this.rings.push({ ...target, r: 0, max: 130, color, born: now });
        this.flashUntil = now + 120;
        this.flashColor = color;
        break;
      case 'weak':
        this.burst(target, 26, 0.18, [color, '#ffffff'], 3, 600);
        this.rings.push({ ...target, r: 0, max: 50, color, born: now });
        break;
      case 'fizzle': {
        const at = { x: s.gather.x, y: s.gather.y + 60 };
        this.burst(at, 30, 0.07, ['#888', '#666', '#aaa'], 6, 1200, -0.0003);
        break;
      }
    }
  }

  private draw(now: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';

    // Perfect spells get a beam during the travel phase.
    for (const s of this.spells) {
      const t = now - s.start;
      if (s.tier === 'perfect' && t > CHARGE_MS + 200 && t < IMPACT_MS + 80) {
        const k = (t - CHARGE_MS - 200) / (IMPACT_MS - CHARGE_MS - 200);
        ctx.strokeStyle = `hsl(${(t / 3) % 360} 100% 70%)`;
        ctx.lineWidth = 6 + k * 18;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(s.gather.x, s.gather.y);
        ctx.lineTo(s.target.x, s.target.y);
        ctx.stroke();
        ctx.lineWidth = 3 + k * 6;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    for (const p of this.particles) {
      const a = 1 - p.life / p.max;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      const s = Math.max(1, Math.round(p.size * (0.5 + a / 2)));
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }

    for (const r of this.rings) {
      const k = (now - r.born) / 700;
      if (k < 0) continue;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.max * k, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    if (now < this.flashUntil) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, this.w, this.h);
    }
    ctx.globalAlpha = 1;
  }
}
