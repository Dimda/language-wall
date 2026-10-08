import { memo } from 'react';
import type { AvatarId, Element } from '../../shared/types';

/**
 * Original 24×32 chibi fighters, painted in code with simple shapes. A post-pass adds a dark
 * outline around the silhouette and darkens the bottom/right silhouette edges for volume.
 */

const GW = 24;
const GH = 32;
const OUTLINE = '#0b0b14';

type Grid = (string | null)[][];

class Painter {
  g: Grid = Array.from({ length: GH }, () => Array<string | null>(GW).fill(null));

  px(x: number, y: number, c: string): this {
    if (x >= 0 && y >= 0 && x < GW && y < GH) this.g[y][x] = c;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c);
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
    }
    return this;
  }

  pixels(list: [number, number][], c: string): this {
    for (const [x, y] of list) this.px(x, y, c);
    return this;
  }
}

function adjust(hex: string, f: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** Outline the silhouette, shade its lower/right edges and lighten its top edge. */
function finish(p: Painter): Grid {
  const src = p.g;
  const out: Grid = src.map((row) => [...row]);
  const filled = (x: number, y: number) => !!src[y]?.[x];
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const c = src[y][x];
      if (!c) {
        if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) out[y][x] = OUTLINE;
      } else if (!filled(x, y + 1) || !filled(x + 1, y)) {
        out[y][x] = adjust(c, -0.22);
      } else if (!filled(x, y - 1)) {
        out[y][x] = adjust(c, 0.12);
      }
    }
  }
  return out;
}

// ── shared body ───────────────────────────────────────

interface BodyOpts {
  skin: string;
  top: string;
  sleeves?: string;
  bottom: string;
  shoes: string;
  legs?: string;
  eyes?: string;
  mouth?: string;
  blush?: string | null;
}

const EYE = '#1a1020';

function body(p: Painter, o: BodyOpts) {
  // legs + shoes
  p.rect(8, 24, 3, 4, o.legs ?? o.bottom).rect(13, 24, 3, 4, o.legs ?? o.bottom);
  p.rect(7, 28, 4, 2, o.shoes).rect(13, 28, 4, 2, o.shoes);
  // torso + arms + hands
  p.rect(7, 16, 10, 8, o.top);
  p.rect(8, 23, 8, 2, o.bottom);
  p.rect(5, 17, 2, 5, o.sleeves ?? o.top).rect(17, 17, 2, 5, o.sleeves ?? o.top);
  p.rect(5, 22, 2, 2, o.skin).rect(17, 22, 2, 2, o.skin);
  // head
  p.ellipse(12, 10, 6.5, 6, o.skin);
  p.px(5, 11, o.skin).px(18, 11, o.skin);
}

function face(p: Painter, o: BodyOpts) {
  const eye = o.eyes ?? EYE;
  // forehead: keeps hair from sitting right on the eyes (reads as glasses otherwise)
  p.rect(7, 9, 10, 1, o.skin);
  p.rect(8, 10, 2, 2, eye).rect(14, 10, 2, 2, eye);
  p.px(8, 10, '#ffffff').px(14, 10, '#ffffff');
  if (o.blush !== null) p.px(7, 12, o.blush ?? '#f49a9a').px(16, 12, o.blush ?? '#f49a9a');
  p.rect(11, 13, 2, 1, o.mouth ?? '#a0404a');
}

/** Round-ish frames with clear lenses: a glint top-right, a small eye bottom-left. */
function glasses(p: Painter, frame: string, lens = '#d8f2ff') {
  for (const x0 of [7, 13]) {
    p.rect(x0 + 1, 9, 2, 1, frame).rect(x0 + 1, 12, 2, 1, frame);
    p.rect(x0, 10, 1, 2, frame).rect(x0 + 3, 10, 1, 2, frame);
    p.rect(x0 + 1, 10, 2, 2, lens);
    p.px(x0 + 2, 10, '#ffffff').px(x0 + 1, 11, EYE);
  }
  p.rect(11, 10, 2, 1, frame);
}

// ── characters ────────────────────────────────────────

interface AvatarDef {
  id: AvatarId;
  label: string;
  labelJa: string;
  paint: (p: Painter) => void;
}

const SKIN = '#f6c9a0';

export const AVATARS: AvatarDef[] = [
  {
    id: 'obachan',
    label: 'Osaka Obachan',
    labelJa: '大阪のおばちゃん',
    paint: (p) => {
      const o = { skin: SKIN, top: '#e0a840', bottom: '#7a3aa0', shoes: '#c03050', mouth: '#e0203a' };
      body(p, o);
      // leopard spots
      p.pixels([[8, 17], [11, 18], [14, 17], [9, 20], [13, 20], [16, 19], [7, 22], [11, 22], [15, 22], [5, 18], [18, 19]], '#3a2410');
      p.pixels([[9, 17], [12, 18], [15, 17], [10, 20], [14, 20], [8, 22], [12, 22]], '#8a5a20');
      // big purple perm
      const H = '#a04ad0';
      p.ellipse(12, 6, 8, 5, H);
      for (const [x, y, r] of [[4, 8, 2.6], [20, 8, 2.6], [4.5, 12, 2.2], [19.5, 12, 2.2], [7, 2.5, 2.4], [12, 1.8, 2.4], [17, 2.5, 2.4]] as const) p.ellipse(x, y, r, r, H);
      p.pixels([[6, 5], [10, 3], [14, 4], [17, 6], [9, 7], [15, 7]], adjust(H, 0.3));
      p.ellipse(12, 11.5, 5.2, 4.2, SKIN);
      face(p, o);
      // 飴ちゃん
      p.rect(19, 21, 2, 2, '#ff6ab0').px(21, 21, '#ffffff').px(18, 22, '#ffffff');
    },
  },
  {
    id: 'gaijin',
    label: 'Gaijin Dev',
    labelJa: '外国人エンジニア',
    paint: (p) => {
      const o = { skin: '#f8d8c4', top: '#5a6a7a', bottom: '#2a4a7a', shoes: '#f0f0f0' };
      body(p, o);
      p.rect(10, 16, 1, 4, '#e8e8e8').rect(13, 16, 1, 4, '#e8e8e8');
      p.rect(9, 21, 6, 2, '#4a5868');
      const H = '#f0d060';
      p.ellipse(12, 6, 7, 4, H);
      p.pixels([[5, 7], [5, 8], [18, 7], [18, 8], [7, 2], [11, 1], [15, 2], [17, 3], [9, 2], [13, 2], [6, 9], [17, 9]], H);
      p.rect(8, 7, 8, 1, H);
      face(p, o);
      glasses(p, '#1a1a1a');
      // laptop
      p.rect(17, 19, 6, 4, '#c8d0dc').rect(18, 20, 4, 2, '#7ad8ff');
    },
  },
  {
    id: 'maiko',
    label: 'Kyoto Maiko',
    labelJa: '舞妓さん',
    paint: (p) => {
      const o = { skin: '#fbf6f2', top: '#d02a4a', bottom: '#d02a4a', shoes: '#3a2010', mouth: '#d0102a', blush: '#ffc0c8' };
      body(p, o);
      p.rect(7, 20, 10, 3, '#e8c040').rect(7, 21, 10, 1, '#c8303a');
      p.pixels([[10, 16], [11, 17], [13, 16], [12, 17]], '#ffffff');
      p.pixels([[8, 18], [15, 18], [9, 23], [14, 24]], '#ffd0e0');
      const H = '#14101a';
      p.ellipse(12, 6, 7.5, 5, H);
      p.ellipse(12, 1.8, 4, 2.2, H);
      p.rect(5, 7, 2, 5, H).rect(17, 7, 2, 5, H);
      // kanzashi flowers + dangles
      p.rect(16, 2, 3, 3, '#ff8ac0').px(17, 3, '#ffe040').rect(5, 3, 2, 2, '#ff5a7a');
      p.pixels([[18, 5], [18, 6], [19, 7], [18, 8]], '#e8c040');
      face(p, o);
    },
  },
  {
    id: 'tourist',
    label: 'Backpacker',
    labelJa: '観光客',
    paint: (p) => {
      // big hiking backpack sticking out on the right, sleeping mat rolled on top
      const PK = '#e8802a';
      p.rect(16, 11, 7, 16, PK);
      p.rect(16, 11, 7, 3, '#c86a1a'); // top flap
      p.rect(18, 15, 1, 11, '#a0501a').rect(21, 15, 1, 11, '#a0501a'); // compression straps
      p.rect(19, 19, 3, 4, '#d0701f').rect(19, 19, 3, 1, '#a0501a'); // side pocket
      p.rect(15, 7, 9, 4, '#3a9a4a').rect(15, 8, 9, 1, '#2a7a3a').rect(15, 10, 9, 1, '#2a7a3a'); // sleeping mat
      const o = { skin: '#e8b48a', top: '#3aa0a0', bottom: '#c8b080', shoes: '#6a4a2a', legs: '#e8b48a' };
      body(p, o);
      p.rect(7, 24, 4, 2, '#c8b080').rect(13, 24, 4, 2, '#c8b080');
      // shoulder straps + camera
      p.rect(8, 16, 1, 7, '#a0501a').rect(15, 16, 2, 7, '#a0501a');
      p.pixels([[10, 16], [11, 17], [12, 17], [13, 16]], '#141414');
      p.rect(10, 18, 4, 3, '#141414').rect(11, 19, 2, 1, '#8aa0c0');
      const H = '#6a3a1a';
      p.rect(6, 7, 12, 2, H);
      p.ellipse(12, 5.5, 6.5, 3.5, '#d83a2a');
      p.rect(12, 7, 8, 2, '#d83a2a').rect(5, 8, 14, 1, '#b02a1a');
      p.px(12, 3, '#ffffff');
      face(p, o);
    },
  },
  {
    id: 'torafan',
    label: 'Tora-fan',
    labelJa: '虎党',
    paint: (p) => {
      const o = { skin: SKIN, top: '#f0d020', bottom: '#141414', shoes: '#141414' };
      body(p, o);
      for (let i = 0; i < 5; i++) {
        p.pixels([[7 + i * 2, 16 + (i % 2)], [8 + i * 2, 18 + (i % 2)], [7 + i * 2, 20], [8 + i * 2, 22]], '#141414');
      }
      p.pixels([[5, 18], [18, 19], [5, 20], [17, 18]], '#141414');
      const H = '#1a1a1a';
      p.ellipse(12, 6, 7, 4, H);
      p.rect(5, 7, 14, 2, '#f4f4f4').px(12, 7, '#e02a2a').px(12, 8, '#e02a2a');
      p.pixels([[19, 7], [20, 8], [19, 9], [21, 9]], '#f4f4f4');
      face(p, o);
      // megaphone
      p.rect(18, 19, 2, 3, '#f4f4f4').rect(20, 18, 3, 5, '#e84a3a').rect(22, 17, 1, 7, '#e84a3a');
    },
  },
  {
    id: 'eikaiwa',
    label: 'Eikaiwa Teacher',
    labelJa: '英会話の先生',
    paint: (p) => {
      const skin = '#8a5434';
      const o = { skin, top: '#f4f4f4', sleeves: '#8a6a3a', bottom: '#4a4a5a', shoes: '#2a1a10', blush: null, mouth: '#f0d0c0' };
      body(p, o);
      p.rect(7, 16, 3, 8, '#8a6a3a').rect(14, 16, 3, 8, '#8a6a3a');
      p.rect(11, 17, 2, 5, '#c8303a');
      const H = '#1a1210';
      p.ellipse(12, 6, 7, 4.2, H);
      for (const [x, y] of [[6, 4], [8, 2.5], [11, 2], [14, 2], [16.5, 3], [18, 5], [5.5, 7], [18.5, 7]] as const) p.ellipse(x, y, 1.8, 1.8, H);
      face(p, o);
      glasses(p, '#e8e0d0');
      // beard around the mouth and chin
      p.pixels([[7, 13], [8, 14], [9, 14], [10, 14], [13, 14], [14, 14], [15, 14], [16, 13], [10, 15], [11, 15], [12, 15], [13, 15], [9, 13], [14, 13]], H);
      // textbook
      p.rect(18, 19, 4, 5, '#c8303a').rect(18, 20, 1, 3, '#f4f4f4');
    },
  },
  {
    id: 'sumo',
    label: 'Sumo Wrestler',
    labelJa: '力士',
    paint: (p) => {
      const S = '#f2c09a';
      const M = '#26285a'; // mawashi
      // thick legs + bare feet
      p.rect(6, 23, 5, 5, S).rect(13, 23, 5, 5, S);
      p.rect(5, 28, 6, 2, adjust(S, -0.12)).rect(13, 28, 6, 2, adjust(S, -0.12));
      // big round body and arms
      p.ellipse(12, 19.5, 8.5, 6.5, S);
      p.ellipse(3.5, 18.5, 2.2, 4.2, S).ellipse(20.5, 18.5, 2.2, 4.2, S);
      p.pixels([[11, 19], [12, 19]], adjust(S, -0.2)); // belly button
      p.pixels([[8, 16], [9, 17], [15, 17], [16, 16]], adjust(S, -0.1)); // chest
      // mawashi belt with front flap and tassels
      p.rect(4, 22, 16, 3, M).rect(10, 25, 4, 2, M);
      p.pixels([[9, 25], [9, 26], [14, 25], [14, 26], [11, 27], [12, 27]], '#1a1a40');
      // head + slicked hair with a topknot
      p.ellipse(12, 10, 6.5, 6, S);
      const H = '#141018';
      p.ellipse(12, 6, 6.5, 3.2, H);
      p.rect(5, 6, 2, 4, H).rect(17, 6, 2, 4, H);
      p.ellipse(12, 2.5, 2.2, 1.6, H).px(12, 4, H);
      face(p, { skin: S, top: M, bottom: M, shoes: S, blush: '#f09a8a' });
      p.pixels([[7, 9], [8, 9], [15, 9], [16, 9]], H); // stern brows
    },
  },
  {
    id: 'otaku',
    label: 'Nipponbashi Otaku',
    labelJa: '日本橋のオタク',
    paint: (p) => {
      // backpack with poster tubes
      p.rect(1, 15, 5, 10, '#2a2a3a');
      p.rect(1, 6, 2, 10, '#f0e0a0').rect(3, 8, 2, 8, '#8ad8ff');
      const o = { skin: '#fbe0d0', top: '#ff8ac8', bottom: '#3a4a7a', shoes: '#e8e8e8', blush: '#f0a0a0' };
      body(p, o);
      p.pixels([[11, 18], [13, 18], [10, 19], [11, 19], [12, 19], [13, 19], [14, 19], [11, 20], [12, 20], [13, 20], [12, 21]], '#ffffff');
      const H = '#d8642a';
      p.ellipse(12, 6, 7, 4.2, H);
      p.pixels([[5, 7], [5, 8], [18, 7], [18, 8], [8, 2], [13, 1], [16, 2], [19, 6]], H);
      p.rect(7, 7, 10, 1, H);
      face(p, o);
      glasses(p, '#1a1a1a');
      p.pixels([[7, 13], [8, 14], [16, 13], [15, 14]], '#d89070');
    },
  },
  {
    id: 'takoyaki',
    label: 'Takoyaki-ya',
    labelJa: 'たこ焼き屋',
    paint: (p) => {
      const o = { skin: SKIN, top: '#f4f4f4', bottom: '#2a4a8a', shoes: '#3a3a3a' };
      body(p, o);
      p.rect(8, 18, 8, 7, '#2a4a8a').rect(10, 20, 4, 3, '#f4f4f4').px(11, 21, '#2a4a8a');
      const H = '#1a1a1a';
      p.ellipse(12, 6, 7, 4, H);
      p.rect(5, 7, 14, 2, '#f4f4f4');
      p.pixels([[19, 6], [20, 5], [19, 8]], '#f4f4f4');
      face(p, o);
      // tray of takoyaki with sauce + aonori
      p.rect(16, 21, 7, 2, '#6a4a2a');
      for (const x of [17, 19, 21]) p.ellipse(x + 0.5, 20, 1.2, 1.2, '#c8803a').px(x, 19, '#5a2a10');
      p.pixels([[18, 19], [20, 20], [22, 19]], '#4a8a3a');
    },
  },
  {
    id: 'yukata',
    label: 'Yukata Debut',
    labelJa: '浴衣デビュー',
    paint: (p) => {
      const o = { skin: '#f2c8a8', top: '#2a5ab0', bottom: '#2a5ab0', shoes: '#8a5a2a' };
      body(p, o);
      p.rect(7, 20, 10, 2, '#e8c040');
      p.pixels([[8, 17], [14, 18], [10, 23], [15, 23], [5, 19], [18, 18], [9, 25]], '#ffffff');
      p.pixels([[11, 16], [12, 17]], '#f4f4f4');
      const H = '#a0522d';
      p.ellipse(12, 6, 7.2, 4.5, H);
      p.rect(5, 6, 2, 7, H);
      // braid over the shoulder
      p.pixels([[4, 12], [4, 13], [5, 14], [4, 15], [5, 16], [4, 17], [5, 18]], H).px(4, 19, '#e8c040');
      p.rect(15, 3, 3, 2, '#ff6a8a').px(16, 3, '#ffe040');
      face(p, o);
      // uchiwa fan
      p.ellipse(20.5, 17.5, 2.6, 2.6, '#ff5a5a').px(20, 17, '#ffffff').rect(20, 20, 1, 3, '#c8a060');
    },
  },
  {
    id: 'shika',
    label: 'Nara Deer',
    labelJa: '奈良の鹿',
    paint: (p) => {
      const F = '#b8783a';
      const A = '#e8d8b0';
      // antlers
      p.pixels([[7, 1], [7, 2], [8, 3], [8, 4], [6, 2], [5, 1], [9, 2], [16, 1], [16, 2], [15, 3], [15, 4], [17, 2], [18, 1], [14, 2]], A);
      // body + legs
      p.ellipse(12, 21, 6, 4.5, F);
      p.rect(8, 24, 2, 5, F).rect(14, 24, 2, 5, F).rect(8, 29, 2, 1, '#2a1a10').rect(14, 29, 2, 1, '#2a1a10');
      p.pixels([[9, 19], [13, 18], [15, 21], [10, 22], [12, 21], [16, 19]], '#fff6e0');
      p.rect(10, 17, 4, 3, '#fff0d8');
      // head + ears
      p.ellipse(12, 10, 5.5, 5, F);
      p.ellipse(4.5, 8, 2.5, 1.4, F).ellipse(19.5, 8, 2.5, 1.4, F);
      p.px(4, 8, '#e8a0a0').px(19, 8, '#e8a0a0');
      p.ellipse(12, 13, 3, 2.2, '#fff0d8');
      p.rect(11, 12, 2, 1, '#1a1010');
      p.rect(8, 9, 2, 2, EYE).rect(14, 9, 2, 2, EYE).px(8, 9, '#ffffff').px(14, 9, '#ffffff');
    },
  },
  {
    id: 'ninja',
    label: 'Koka Ninja',
    labelJa: '甲賀忍者',
    paint: (p) => {
      const D = '#2a2a40';
      const o = { skin: D, top: D, bottom: '#1a1a28', shoes: '#141420', blush: null };
      body(p, o);
      p.rect(7, 19, 10, 1, '#d83a3a');
      p.ellipse(12, 10, 6.5, 6, D);
      p.rect(6, 9, 12, 4, '#f6c9a0');
      p.rect(8, 10, 2, 2, EYE).rect(14, 10, 2, 2, EYE).px(8, 10, '#ffffff').px(14, 10, '#ffffff');
      p.rect(6, 6, 12, 2, '#d83a3a');
      p.pixels([[18, 6], [19, 5], [20, 6], [21, 5], [19, 7], [20, 8]], '#d83a3a');
      // shuriken
      p.pixels([[20, 20], [19, 21], [21, 21], [20, 22], [18, 20], [22, 22], [20, 21]], '#c8d0dc');
    },
  },
];

export const avatarDef = (id: AvatarId): AvatarDef => AVATARS.find((a) => a.id === id) ?? AVATARS[0];

/** Paint once per avatar, then merge horizontal runs of the same color into single rects. */
const RENDERED = new Map<AvatarId, { x: number; y: number; w: number; c: string }[]>();

function runsFor(id: AvatarId) {
  const cached = RENDERED.get(id);
  if (cached) return cached;
  const p = new Painter();
  avatarDef(id).paint(p);
  const grid = finish(p);
  const runs: { x: number; y: number; w: number; c: string }[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < GW) {
      const c = row[x];
      if (!c) {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < GW && row[x + w] === c) w++;
      runs.push({ x, y, w, c });
      x += w;
    }
  });
  RENDERED.set(id, runs);
  return runs;
}

export const Sprite = memo(function Sprite({ avatar, size = 64 }: { avatar: AvatarId; size?: number }) {
  const def = avatarDef(avatar);
  return (
    <svg className="sprite" viewBox={`0 0 ${GW} ${GH}`} width={size * 0.75} height={size} shapeRendering="crispEdges" aria-label={def.label}>
      {runsFor(def.id).map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w + 0.02} height="1.02" fill={r.c} />
      ))}
    </svg>
  );
});

export const ELEMENT_COLOR: Record<Element, string> = {
  fire: '#ff6a2a',
  ice: '#6ad8ff',
  thunder: '#ffe84a',
  wind: '#6aff9a',
  light: '#fff2b0',
  shadow: '#c07aff',
};

export const ELEMENT_LABEL: Record<Element, { en: string; ja: string; icon: string }> = {
  fire: { en: 'Flame', ja: '炎', icon: '🔥' },
  ice: { en: 'Frost', ja: '氷', icon: '❄' },
  thunder: { en: 'Thunder', ja: '雷', icon: '⚡' },
  wind: { en: 'Gale', ja: '風', icon: '🌀' },
  light: { en: 'Radiance', ja: '光', icon: '✦' },
  shadow: { en: 'Shadow', ja: '闇', icon: '☾' },
};
