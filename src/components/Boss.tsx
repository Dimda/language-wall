import { memo } from 'react';

const COLS = 9;
const ROWS = 7;
const BW = 32;
const BH = 16;
const W = COLS * BW; // 288
const H = ROWS * BH; // 112

/** Deterministic pseudo-random so the boss looks the same on every render and every screen. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── wall ──────────────────────────────────────────────

const BRICKS = (() => {
  const r = rng(7);
  const out: { x: number; y: number; shade: number; chip: number }[] = [];
  for (let row = 0; row < ROWS; row++) {
    const offset = row % 2 === 0 ? 0 : -BW / 2;
    for (let c = 0; c < COLS + 1; c++) out.push({ x: offset + c * BW, y: row * BH, shade: Math.floor(r() * 5), chip: r() });
  }
  return out;
})();

// ── mouth: a jagged tear across the wall ──────────────

const MOUTH_L = 50;
const MOUTH_R = W - 50;
const MOUTH_TOP = 54;
const MOUTH_BOT = 84;

const { mouthPoints, topEdge, botEdge } = (() => {
  const r = rng(42);
  const steps = 14;
  const topEdge: [number, number][] = [];
  const botEdge: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = MOUTH_L + ((MOUTH_R - MOUTH_L) * i) / steps;
    const k = Math.sin((Math.PI * i) / steps); // fuller in the middle
    topEdge.push([x, MOUTH_TOP + (1 - k) * 12 + (r() - 0.5) * 5]);
    botEdge.push([x, MOUTH_BOT - (1 - k) * 14 + (r() - 0.5) * 6]);
  }
  const pts = [...topEdge, ...[...botEdge].reverse()].map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return { mouthPoints: pts, topEdge, botEdge };
})();

const TEETH = (() => {
  const r = rng(99);
  const teeth: { points: string; drool: boolean; x: number; tip: number }[] = [];
  topEdge.slice(1, -1).forEach(([x, y], i) => {
    const len = 9 + r() * 15 + (i === 1 || i === topEdge.length - 4 ? 10 : 0);
    const w = 4 + r() * 4;
    const lean = (r() - 0.5) * 5;
    teeth.push({ points: `${x - w},${y - 2} ${x + w},${y - 2} ${x + lean},${y + len}`, drool: r() < 0.3, x: x + lean, tip: y + len });
  });
  botEdge.slice(1, -1).forEach(([x, y]) => {
    const xx = x + 5;
    const len = 6 + r() * 11;
    const w = 3 + r() * 3;
    teeth.push({ points: `${xx - w},${y + 2} ${xx + w},${y + 2} ${xx + (r() - 0.5) * 4},${y - len}`, drool: false, x: xx, tip: y - len });
  });
  return teeth;
})();

// ── extra eyes that open in random bricks ─────────────

const SMALL_EYES = [
  { x: 22, y: 12, d: 0 },
  { x: 262, y: 26, d: 1.7 },
  { x: 34, y: 100, d: 3.1 },
  { x: 250, y: 98, d: 0.9 },
  { x: 150, y: 9, d: 2.4 },
  { x: 120, y: 103, d: 4.2 },
];

// ── wings ─────────────────────────────────────────────

/** Tattered membrane: attaches at the wall's left edge, ragged trailing edge between bone tips. */
const WING =
  '0,4 -26,-44 -40,-30 -46,-40 -58,-22 -78,-62 -88,-26 -96,-34 -104,-10 -130,-36 -122,6 -132,12 -124,22 -148,38 -114,36 -110,48 -96,44 -84,76 -70,56 -62,66 -50,50 -38,58 -26,46 0,78';
const WING_BONES: [number, number][] = [
  [-26, -44],
  [-78, -62],
  [-130, -36],
  [-148, 38],
  [-84, 76],
];
const WING_HOLES = ['-70,-6 -62,-12 -58,-2 -66,4', '-104,18 -96,12 -94,24', '-40,30 -32,24 -30,36 -38,38'];

const Wing = ({ side }: { side: 'left' | 'right' }) => (
  <g transform={side === 'right' ? `translate(${W} 0) scale(-1 1)` : undefined}>
    <g className={`wing wing-${side}`}>
      <polygon points={WING} className="wing-membrane" mask="url(#wingHoles)" />
      {WING_BONES.map(([x, y]) => (
        <path key={`v${x}`} d={`M0,30 Q${x * 0.4},${y * 0.2 + 34} ${x * 0.85},${y * 0.85 + 4}`} className="wing-vein" />
      ))}
      {WING_BONES.map(([x, y]) => (
        <line key={`b${x}`} x1="0" y1="18" x2={x} y2={y} className="wing-bone" />
      ))}
      {WING_BONES.map(([x, y]) => (
        <polygon key={`c${x}`} points={`${x},${y} ${x - 8},${y - 11} ${x + 3},${y - 3}`} className="wing-claw" />
      ))}
    </g>
  </g>
);

// ── boss ──────────────────────────────────────────────

export const Boss = memo(function Boss({ hpPct, hitKey }: { hpPct: number; hitKey: number }) {
  const tongueX = W / 2;
  const tongueY = MOUTH_BOT - 10;

  return (
    <div className={`boss ${hpPct <= 0 ? 'dead' : ''} ${hpPct < 33 ? 'enraged' : ''}`}>
      <svg
        key={hitKey}
        className={hitKey ? 'boss-svg hit' : 'boss-svg'}
        viewBox={`-160 -86 ${W + 320} ${H + 150}`}
        role="img"
        aria-label="The Language Wall: a blackened brick wall with torn dragon wings, burning eyes, fangs and a forked tongue"
      >
        <defs>
          <radialGradient id="aura">
            <stop offset="0%" stopColor="#ff2a10" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#600010" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="maw" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#ff3a10" />
            <stop offset="35%" stopColor="#7a0810" />
            <stop offset="100%" stopColor="#050002" />
          </radialGradient>
          <linearGradient id="eyeFire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff6b0" />
            <stop offset="45%" stopColor="#ff9a10" />
            <stop offset="100%" stopColor="#c00010" />
          </linearGradient>
          <linearGradient id="bone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d8ccb0" />
            <stop offset="100%" stopColor="#6a5a40" />
          </linearGradient>
          <linearGradient id="horn" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#1a1010" />
            <stop offset="70%" stopColor="#5a4a3a" />
            <stop offset="100%" stopColor="#d8ccb0" />
          </linearGradient>
          <linearGradient id="membrane" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#120810" />
            <stop offset="100%" stopColor="#3a0a1e" />
          </linearGradient>
          <radialGradient id="shade" cx="50%" cy="62%" r="65%">
            <stop offset="0%" stopColor="#ff2a10" stopOpacity="0.18" />
            <stop offset="45%" stopColor="#000" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.8" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id="wallclip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
          <mask id="wingHoles">
            <rect x="-200" y="-100" width="400" height="300" fill="#fff" />
            {WING_HOLES.map((p) => (
              <polygon key={p} points={p} fill="#000" />
            ))}
          </mask>
        </defs>

        <ellipse cx={W / 2} cy={H / 2} rx={W * 0.9} ry={H * 1.1} fill="url(#aura)" className="aura" />

        <Wing side="left" />
        <Wing side="right" />

        {/* curved horns */}
        <path d={`M${W * 0.16},4 Q${W * 0.05},-30 ${W * 0.12},-66 Q${W * 0.14},-36 ${W * 0.27},2 Z`} fill="url(#horn)" className="horn" />
        <path d={`M${W * 0.84},4 Q${W * 0.95},-30 ${W * 0.88},-66 Q${W * 0.86},-36 ${W * 0.73},2 Z`} fill="url(#horn)" className="horn" />

        {/* molten mortar glowing through the bricks */}
        <rect x="-4" y="-4" width={W + 8} height={H + 8} className="wall-outline" />
        <rect x="0" y="0" width={W} height={H} className="mortar" filter="url(#glow)" />
        <g clipPath="url(#wallclip)" shapeRendering="crispEdges">
          {BRICKS.map((b) => (
            <g key={`${b.x},${b.y}`}>
              <rect x={b.x + 1.5} y={b.y + 1.5} width={BW - 3} height={BH - 3} className={`brick b${b.shade}`} />
              <rect x={b.x + 1.5} y={b.y + 1.5} width={BW - 3} height="2" className="brick-top" />
              {b.chip > 0.7 && <rect x={b.x + BW - 9} y={b.y + BH - 6} width="6" height="4" className="mortar-chip" />}
            </g>
          ))}
        </g>

        <rect x="0" y="0" width={W} height={H} fill="url(#shade)" />

        {/* eyes that open in the bricks */}
        {SMALL_EYES.map((e) => (
          <g key={`${e.x},${e.y}`} className="small-eye" style={{ animationDelay: `${e.d}s`, transformOrigin: `${e.x}px ${e.y}px` }}>
            <ellipse cx={e.x} cy={e.y} rx="7" ry="3.5" className="small-eye-white" />
            <ellipse cx={e.x} cy={e.y} rx="1.4" ry="3" className="small-eye-pupil" />
          </g>
        ))}

        {/* brow ridge + burning slit eyes */}
        <polygon points={`${W * 0.14},18 ${W * 0.46},38 ${W * 0.5},34 ${W * 0.54},38 ${W * 0.86},18 ${W * 0.86},28 ${W * 0.56},44 ${W * 0.44},44 ${W * 0.14},28`} className="brow" />
        <g className="eyes" filter="url(#glow)">
          <polygon points={`${W * 0.2},32 ${W * 0.42},42 ${W * 0.4},48 ${W * 0.24},44`} fill="url(#eyeFire)" />
          <polygon points={`${W * 0.8},32 ${W * 0.58},42 ${W * 0.6},48 ${W * 0.76},44`} fill="url(#eyeFire)" />
          <polygon points={`${W * 0.33},35 ${W * 0.345},40 ${W * 0.33},47 ${W * 0.315},40`} className="pupil" />
          <polygon points={`${W * 0.67},35 ${W * 0.685},40 ${W * 0.67},47 ${W * 0.655},40`} className="pupil" />
        </g>

        {/* the maw */}
        <polygon points={mouthPoints} fill="url(#maw)" className="maw" />
        <g className="tongue" style={{ transformOrigin: `${tongueX}px ${tongueY}px` }}>
          <path
            d={`M${tongueX - 6},${tongueY} C${tongueX - 14},${tongueY + 22} ${tongueX + 14},${tongueY + 30} ${tongueX + 2},${tongueY + 48} L${tongueX + 16},${tongueY + 66} L${tongueX + 4},${tongueY + 56} L${tongueX - 6},${tongueY + 68} L${tongueX - 4},${tongueY + 50} C${tongueX + 2},${tongueY + 32} ${tongueX - 18},${tongueY + 22} ${tongueX + 6},${tongueY} Z`}
            className="tongue-shape"
          />
        </g>
        {TEETH.map((t) => (
          <polygon key={t.points} points={t.points} fill="url(#bone)" className="fang" />
        ))}
        {TEETH.filter((t) => t.drool).map((t, i) => (
          <line key={`d${t.x}`} x1={t.x} y1={t.tip} x2={t.x} y2={t.tip + 14} className="drool" style={{ animationDelay: `${i * 0.7}s`, transformOrigin: `${t.x}px ${t.tip}px` }} />
        ))}

        {/* name carved into the stone */}
        <text x={W / 2} y={H + 2} className="carved" textAnchor="middle" filter="url(#glow)">
          言 葉 の 壁
        </text>

        {/* cracks */}
        {hpPct < 66 && (
          <polyline className="crack" filter="url(#glow)" points={`${W * 0.06},0 ${W * 0.12},${H * 0.2} ${W * 0.05},${H * 0.38} ${W * 0.14},${H * 0.6}`} />
        )}
        {hpPct < 33 && (
          <>
            <polyline className="crack" filter="url(#glow)" points={`${W * 0.94},${H} ${W * 0.86},${H * 0.78} ${W * 0.95},${H * 0.55} ${W * 0.88},${H * 0.3} ${W * 0.96},0`} />
            <polyline className="crack" filter="url(#glow)" points={`${W * 0.5},0 ${W * 0.47},${H * 0.12} ${W * 0.53},${H * 0.22}`} />
          </>
        )}

        {/* rising embers */}
        {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((k, i) => (
          <rect key={k} x={W * k} y={-6} width="3" height="3" className="ember" style={{ animationDelay: `${i * 0.55}s` }} />
        ))}
      </svg>
    </div>
  );
});
