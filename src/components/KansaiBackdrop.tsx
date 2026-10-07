import { memo } from 'react';

/**
 * Original pixel-style Kansai panorama at blood-red dusk, left → right:
 * Kobe Port Tower · Osaka Castle · Tsutenkaku · Abeno Harukas · Yasaka pagoda (Kyoto) ·
 * Fushimi Inari torii trail — over the Dotonbori river, under a string of chochin lanterns,
 * with Nara deer on the riverbank.
 */

const VW = 800;
const VH = 320;
const HORIZON = 196;

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Generic city blocks with lit windows. */
const CITY = (() => {
  const r = rng(3);
  const out: { x: number; w: number; h: number; windows: [number, number][] }[] = [];
  let x = 0;
  while (x < VW) {
    const w = 18 + Math.floor(r() * 26);
    const h = 26 + Math.floor(r() * 50);
    const windows: [number, number][] = [];
    for (let wy = HORIZON - h + 5; wy < HORIZON - 4; wy += 7) {
      for (let wx = x + 3; wx < x + w - 4; wx += 6) if (r() < 0.32) windows.push([wx, wy]);
    }
    out.push({ x, w, h, windows });
    x += w + 1;
  }
  return out;
})();

const STARS = (() => {
  const r = rng(11);
  return Array.from({ length: 40 }, () => [Math.floor(r() * VW), Math.floor(r() * 90)] as const);
})();

function PortTower({ x }: { x: number }) {
  // Hourglass lattice: wide top and bottom, narrow waist.
  const top = HORIZON - 120;
  return (
    <g>
      <polygon
        points={`${x - 13},${top} ${x + 13},${top} ${x + 4},${top + 60} ${x + 15},${HORIZON} ${x - 15},${HORIZON} ${x - 4},${top + 60}`}
        fill="#a02030"
      />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line key={i} x1={x - 12 + i * 3.4} y1={top} x2={x + 14 - i * 3.4} y2={HORIZON} stroke="#d84050" strokeWidth="0.8" opacity="0.7" />
      ))}
      <rect x={x - 15} y={top - 6} width="30" height="6" fill="#601020" />
      <rect x={x - 1} y={top - 16} width="2" height="10" fill="#601020" />
      <rect x={x - 1} y={top - 18} width="2" height="2" fill="#ff4a4a" className="bd-blink" />
    </g>
  );
}

function OsakaCastle({ x }: { x: number }) {
  // Stone base, then tiers of white walls with green roofs and gold ridge ornaments.
  const base = HORIZON - 30;
  const tiers = [
    { w: 92, h: 16 },
    { w: 76, h: 15 },
    { w: 62, h: 14 },
    { w: 48, h: 13 },
    { w: 34, h: 13 },
  ];
  let y = base;
  const parts: React.ReactNode[] = [];
  tiers.forEach((t, i) => {
    y -= t.h;
    parts.push(
      <g key={i}>
        <rect x={x - t.w / 2 + 6} y={y + 4} width={t.w - 12} height={t.h - 4} fill="#d8d2c8" />
        {Array.from({ length: Math.floor((t.w - 16) / 10) }, (_, k) => (
          <rect key={k} x={x - t.w / 2 + 10 + k * 10} y={y + 7} width="4" height="4" fill={k % 3 === 1 ? '#ffd27a' : '#2a2a3a'} />
        ))}
        <polygon points={`${x - t.w / 2},${y + 5} ${x + t.w / 2},${y + 5} ${x + t.w / 2 - 8},${y - 1} ${x - t.w / 2 + 8},${y - 1}`} fill="#2f7a68" />
        <rect x={x - t.w / 2} y={y + 4} width={t.w} height="1.5" fill="#e8c040" />
      </g>,
    );
  });
  return (
    <g>
      <polygon points={`${x - 62},${HORIZON} ${x + 62},${HORIZON} ${x + 52},${base} ${x - 52},${base}`} fill="#4a4048" />
      {[0, 1, 2].map((r) => (
        <line key={r} x1={x - 58 + r * 3} y1={base + 8 + r * 7} x2={x + 58 - r * 3} y2={base + 8 + r * 7} stroke="#352d35" strokeWidth="1" />
      ))}
      {parts}
      {/* roof peak + golden shachihoko */}
      <polygon points={`${x - 20},${y} ${x + 20},${y} ${x},${y - 12}`} fill="#2f7a68" />
      <rect x={x - 14} y={y - 8} width="4" height="5" fill="#ffd040" />
      <rect x={x + 10} y={y - 8} width="4" height="5" fill="#ffd040" />
    </g>
  );
}

function Tsutenkaku({ x }: { x: number }) {
  const top = HORIZON - 132;
  return (
    <g>
      <polygon points={`${x - 22},${HORIZON} ${x - 8},${top + 70} ${x + 8},${top + 70} ${x + 22},${HORIZON}`} fill="#3a2a3a" />
      <polygon points={`${x - 12},${HORIZON} ${x},${top + 92} ${x + 12},${HORIZON}`} fill="#1a0e1a" />
      <rect x={x - 9} y={top + 22} width="18" height="50" fill="#4a3a48" />
      <rect x={x - 14} y={top + 12} width="28" height="12" fill="#5a4a58" />
      <rect x={x - 13} y={top + 15} width="26" height="5" fill="#ffd27a" className="bd-glow" />
      <rect x={x - 6} y={top} width="12" height="12" fill="#4a3a48" />
      <rect x={x - 1} y={top - 14} width="2" height="14" fill="#4a3a48" />
      <rect x={x - 9} y={top + 30} width="18" height="2" fill="#6ad8ff" opacity="0.7" />
      <rect x={x - 9} y={top + 40} width="18" height="2" fill="#ff6ab0" opacity="0.7" />
    </g>
  );
}

function Harukas({ x }: { x: number }) {
  // Stepped glass skyscraper.
  const steps = [
    { w: 40, h: 60 },
    { w: 32, h: 50 },
    { w: 24, h: 46 },
  ];
  let y = HORIZON;
  return (
    <g>
      {steps.map((s, i) => {
        y -= s.h;
        const yy = y;
        return (
          <g key={i}>
            <rect x={x - s.w / 2} y={yy} width={s.w} height={s.h} fill="#241a2e" />
            {Array.from({ length: Math.floor(s.h / 6) }, (_, k) => (
              <rect key={k} x={x - s.w / 2 + 3} y={yy + 3 + k * 6} width={s.w - 6} height="1" fill="#6a4a7a" opacity="0.6" />
            ))}
          </g>
        );
      })}
      <rect x={x - 1} y={y - 10} width="2" height="10" fill="#241a2e" />
      <rect x={x - 1} y={y - 12} width="2" height="2" fill="#ff4a4a" className="bd-blink" />
    </g>
  );
}

function Pagoda({ x }: { x: number }) {
  // Yasaka five-storey pagoda.
  const parts: React.ReactNode[] = [];
  let y = HORIZON - 8;
  for (let i = 0; i < 5; i++) {
    const w = 46 - i * 6;
    const h = 18;
    y -= h;
    parts.push(
      <g key={i}>
        <rect x={x - w / 2 + 9} y={y + 5} width={w - 18} height={h - 5} fill="#3a1a1c" />
        <polygon points={`${x - w / 2 - 4},${y + 6} ${x + w / 2 + 4},${y + 6} ${x + w / 2 - 6},${y} ${x - w / 2 + 6},${y}`} fill="#140a10" />
        <rect x={x - 2} y={y + 9} width="4" height="5" fill="#ffb04a" opacity="0.8" />
      </g>,
    );
  }
  return (
    <g>
      <rect x={x - 20} y={HORIZON - 8} width="40" height="8" fill="#2a1418" />
      {parts}
      <rect x={x - 1} y={y - 26} width="2" height="26" fill="#806030" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={x - 3} y={y - 22 + i * 4} width="6" height="1.5" fill="#806030" />
      ))}
    </g>
  );
}

function ToriiTrail({ x0, y0 }: { x0: number; y0: number }) {
  // Gates marching up the hill, shrinking with distance.
  return (
    <g>
      {Array.from({ length: 9 }, (_, i) => {
        const k = 1 - i * 0.085;
        const x = x0 + i * 13;
        const y = y0 - i * 7;
        const w = 26 * k;
        const h = 30 * k;
        return (
          <g key={i} opacity={0.55 + 0.45 * k}>
            <rect x={x - w / 2} y={y - h} width={w} height={3 * k} fill="#141010" />
            <rect x={x - w / 2 + 2} y={y - h + 3 * k} width={w - 4} height={2.5 * k} fill="#ff5a1a" />
            <rect x={x - w / 2 + 3} y={y - h + 7 * k} width={w - 6} height={2 * k} fill="#ff5a1a" />
            <rect x={x - w / 2 + 4} y={y - h + 3 * k} width={3 * k} height={h - 3 * k} fill="#ff5a1a" />
            <rect x={x + w / 2 - 4 - 3 * k} y={y - h + 3 * k} width={3 * k} height={h - 3 * k} fill="#ff5a1a" />
          </g>
        );
      })}
    </g>
  );
}

function Deer({ x, y, flip }: { x: number; y: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) ${flip ? 'scale(-1 1)' : ''}`} fill="#1a0e10">
      <rect x="-10" y="-12" width="20" height="8" />
      <rect x="-9" y="-4" width="2" height="8" />
      <rect x="-4" y="-4" width="2" height="8" />
      <rect x="3" y="-4" width="2" height="8" />
      <rect x="7" y="-4" width="2" height="8" />
      <rect x="8" y="-20" width="4" height="10" />
      <rect x="9" y="-24" width="8" height="5" />
      <rect x="9" y="-30" width="1.5" height="6" />
      <rect x="13" y="-30" width="1.5" height="6" />
      <rect x="7" y="-31" width="4" height="1.5" />
      <rect x="12" y="-31" width="4" height="1.5" />
      <rect x="-12" y="-13" width="3" height="3" fill="#fff6e0" opacity="0.6" />
    </g>
  );
}

/** Renders a layer twice side by side and slides it left forever; each layer tiles every VW units. */
function Scroll({ seconds, children }: { seconds: number; children: React.ReactNode }) {
  return (
    <g className="bd-scroll" style={{ animationDuration: `${seconds}s` }}>
      <g>{children}</g>
      <g transform={`translate(${VW} 0)`}>{children}</g>
    </g>
  );
}

/** Lanterns hang in scallops between posts every 200 units so the string tiles seamlessly. */
const LANTERNS = Array.from({ length: 16 }, (_, i) => {
  const x = 25 + i * 50;
  const t = ((x % 200) / 200) * Math.PI;
  return { x, y: 26 + Math.sin(t) * 18 };
});

export const KansaiBackdrop = memo(function KansaiBackdrop() {
  return (
    <svg className="backdrop" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="bd-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c0416" />
          <stop offset="45%" stopColor="#2c0a26" />
          <stop offset="80%" stopColor="#7a1a2a" />
          <stop offset="100%" stopColor="#c8482a" />
        </linearGradient>
        <radialGradient id="bd-moon">
          <stop offset="0%" stopColor="#ffb08a" />
          <stop offset="60%" stopColor="#e0402a" />
          <stop offset="100%" stopColor="#e0402a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bd-river" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a1028" />
          <stop offset="100%" stopColor="#0c0612" />
        </linearGradient>
      </defs>

      {/* static sky */}
      <rect width={VW} height={HORIZON} fill="url(#bd-sky)" />
      {STARS.map(([x, y]) => (
        <rect key={`${x},${y}`} x={x} y={y} width="1.5" height="1.5" fill="#ffd8e8" opacity="0.6" />
      ))}
      <circle cx="560" cy="78" r="56" fill="url(#bd-moon)" opacity="0.55" />
      <circle cx="560" cy="78" r="30" fill="#e8583a" />
      <circle cx="550" cy="70" r="6" fill="#c8402a" opacity="0.6" />
      <circle cx="570" cy="88" r="4" fill="#c8402a" opacity="0.6" />

      {/* far mountains: Rokko / Ikoma */}
      <Scroll seconds={160}>
        <polygon
          points={`0,${HORIZON - 52} 60,${HORIZON - 70} 120,${HORIZON - 52} 200,${HORIZON - 84} 290,${HORIZON - 56} 380,${HORIZON - 74} 470,${HORIZON - 48} 560,${HORIZON - 66} 650,${HORIZON - 90} 730,${HORIZON - 60} ${VW},${HORIZON - 52} ${VW},${HORIZON} 0,${HORIZON}`}
          fill="#2a0c22"
        />
      </Scroll>

      {/* distant city */}
      <Scroll seconds={90}>
        <g shapeRendering="crispEdges">
          {CITY.map((b) => (
            <g key={b.x}>
              <rect x={b.x} y={HORIZON - b.h} width={b.w} height={b.h} fill="#1e0c1e" />
              {b.windows.map(([wx, wy]) => (
                <rect key={`${wx},${wy}`} x={wx} y={wy} width="2" height="3" fill="#ffcf6a" opacity="0.75" />
              ))}
            </g>
          ))}
        </g>
      </Scroll>

      {/* landmarks */}
      <Scroll seconds={60}>
        <g shapeRendering="crispEdges">
          <PortTower x={70} />
          <OsakaCastle x={250} />
          <Tsutenkaku x={420} />
          <Harukas x={485} />
          <Pagoda x={640} />
          <ToriiTrail x0={690} y0={HORIZON} />
        </g>
      </Scroll>

      {/* Dotonbori river with neon reflections */}
      <rect y={HORIZON} width={VW} height="22" fill="url(#bd-river)" />
      <Scroll seconds={40}>
        {(
          [
            [80, '#ff6ab0'],
            [210, '#6ad8ff'],
            [330, '#ffd040'],
            [455, '#ff6ab0'],
            [600, '#6ad8ff'],
            [720, '#ffd040'],
          ] as const
        ).map(([x, c], i) => (
          <g key={i} className="bd-ripple" style={{ animationDelay: `${i * 0.5}s` }}>
            <rect x={x} y={HORIZON + 4} width="26" height="1.5" fill={c} opacity="0.6" />
            <rect x={x + 6} y={HORIZON + 9} width="16" height="1.5" fill={c} opacity="0.45" />
            <rect x={x + 2} y={HORIZON + 14} width="10" height="1.5" fill={c} opacity="0.3" />
          </g>
        ))}
      </Scroll>

      {/* stone riverside ground + deer (nearest, fastest) */}
      <rect y={HORIZON + 22} width={VW} height={VH - HORIZON - 22} fill="#1a1218" />
      <rect y={HORIZON + 22} width={VW} height="3" fill="#3a2a30" />
      <Scroll seconds={24}>
        <g shapeRendering="crispEdges" opacity="0.5">
          {Array.from({ length: 4 }, (_, row) =>
            Array.from({ length: 21 }, (_, c) => (
              <rect
                key={`${row}-${c}`}
                x={c * 40 + (row % 2) * 20 - 20}
                y={HORIZON + 28 + row * 24}
                width="38"
                height="22"
                fill="none"
                stroke="#2a1e26"
                strokeWidth="1.5"
              />
            )),
          )}
        </g>
        <Deer x={60} y={HORIZON + 46} />
        <Deer x={470} y={HORIZON + 52} flip />
      </Scroll>

      {/* chochin lantern string, in front of everything */}
      <Scroll seconds={30}>
        <polyline points={['0,20', ...LANTERNS.map((l) => `${l.x},${l.y - 6}`), `${VW},20`].join(' ')} fill="none" stroke="#120810" strokeWidth="1.2" />
        {LANTERNS.map((l, i) => (
          <g key={i} className="bd-lantern" style={{ animationDelay: `${(i % 5) * 0.4}s` }}>
            <rect x={l.x - 4} y={l.y - 5} width="8" height="10" rx="3" fill={i % 3 === 0 ? '#ffffff' : '#e8302a'} />
            <rect x={l.x - 4} y={l.y - 6} width="8" height="1.5" fill="#120810" />
            <rect x={l.x - 4} y={l.y + 4} width="8" height="1.5" fill="#120810" />
          </g>
        ))}
      </Scroll>
    </svg>
  );
});
