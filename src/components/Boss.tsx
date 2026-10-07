const COLS = 9;
const ROWS = 7;
const BW = 32;
const BH = 16;
const W = COLS * BW; // 288
const H = ROWS * BH; // 112

/** Wing membrane: attaches at the wall's left edge and spreads out to bony tips. */
const WING = '0,8 -30,-38 -52,-22 -78,-52 -84,-14 -112,-28 -102,14 -118,34 -82,30 -70,62 -44,44 0,74';
const WING_BONES: [number, number][] = [
  [-30, -38],
  [-78, -52],
  [-112, -28],
  [-118, 34],
  [-70, 62],
];

/** Mouth spans this range; fangs hang from the top lip and rise from the bottom one. */
const MOUTH = { x: W * 0.27, y: 50, w: W * 0.46, h: 24 };

function Wing({ side }: { side: 'left' | 'right' }) {
  const flip = side === 'right' ? `translate(${W} 0) scale(-1 1)` : undefined;
  return (
    <g transform={flip}>
      <g className={`wing wing-${side}`}>
        <polygon points={WING} className="wing-membrane" />
        <polygon points="0,8 -30,-38 -52,-22 -78,-52 -84,-14 -40,20 0,30" className="wing-shade" />
        {WING_BONES.map(([x, y]) => (
          <line key={`${x},${y}`} x1="0" y1="20" x2={x} y2={y} className="wing-bone" />
        ))}
        {WING_BONES.map(([x, y]) => (
          <polygon key={`c${x},${y}`} points={`${x},${y} ${x - 6},${y - 8} ${x + 2},${y - 2}`} className="wing-claw" />
        ))}
      </g>
    </g>
  );
}

/** Original pixel-style brick wall dragon boss, drawn with SVG. */
export function Boss({ hpPct, hitKey }: { hpPct: number; hitKey: number }) {
  const bricks: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    const offset = r % 2 === 0 ? 0 : -BW / 2;
    for (let c = 0; c < COLS + 1; c++) {
      const x = offset + c * BW;
      const shade = (r * 7 + c * 3) % 5;
      bricks.push(
        <rect key={`${r}-${c}`} x={x + 1} y={r * BH + 1} width={BW - 2} height={BH - 2} className={`brick b${shade}`} />,
      );
    }
  }

  const topFangs = [0.08, 0.22, 0.78, 0.92].map((k, i) => {
    const x = MOUTH.x + MOUTH.w * k;
    const long = i === 0 || i === 3;
    return <polygon key={`t${k}`} points={`${x - 6},${MOUTH.y} ${x + 6},${MOUTH.y} ${x},${MOUTH.y + (long ? 24 : 13)}`} className="fang" />;
  });
  const bottomFangs = [0.35, 0.5, 0.65].map((k) => {
    const x = MOUTH.x + MOUTH.w * k;
    const y = MOUTH.y + MOUTH.h;
    return <polygon key={`b${k}`} points={`${x - 5},${y} ${x + 5},${y} ${x},${y - 11}`} className="fang" />;
  });
  const tongueX = MOUTH.x + MOUTH.w / 2;
  const tongueY = MOUTH.y + MOUTH.h - 6;

  return (
    <div className={`boss ${hpPct <= 0 ? 'dead' : ''} ${hpPct < 33 ? 'enraged' : ''}`}>
      <svg
        key={hitKey}
        className={hitKey ? 'boss-svg hit' : 'boss-svg'}
        viewBox={`-124 -60 ${W + 248} ${H + 120}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label="The Language Wall, a brick wall with dragon wings, fangs and a forked tongue"
      >
        <defs>
          <clipPath id="wallclip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>

        <Wing side="left" />
        <Wing side="right" />

        {/* horns */}
        <polygon points={`${W * 0.18},2 ${W * 0.26},2 ${W * 0.12},-30`} className="horn" />
        <polygon points={`${W * 0.74},2 ${W * 0.82},2 ${W * 0.88},-30`} className="horn" />

        <rect x="-4" y="-4" width={W + 8} height={H + 8} className="wall-outline" />
        <g clipPath="url(#wallclip)">{bricks}</g>

        {/* eyes: glowing slits */}
        <g className="eyes">
          <polygon points={`${W * 0.24},30 ${W * 0.38},36 ${W * 0.36},44 ${W * 0.26},42`} className="eye" />
          <polygon points={`${W * 0.76},30 ${W * 0.62},36 ${W * 0.64},44 ${W * 0.74},42`} className="eye" />
          <rect x={W * 0.315} y="32" width="3" height="11" className="pupil" />
          <rect x={W * 0.675} y="32" width="3" height="11" className="pupil" />
          <polygon points={`${W * 0.2},20 ${W * 0.4},30 ${W * 0.4},34 ${W * 0.2},26`} className="brow" />
          <polygon points={`${W * 0.8},20 ${W * 0.6},30 ${W * 0.6},34 ${W * 0.8},26`} className="brow" />
        </g>

        {/* maw */}
        <rect x={MOUTH.x} y={MOUTH.y} width={MOUTH.w} height={MOUTH.h} className="maw" />
        <rect x={MOUTH.x + 4} y={MOUTH.y + 4} width={MOUTH.w - 8} height={MOUTH.h - 6} className="maw-inner" />
        {topFangs}
        {bottomFangs}

        {/* name plate */}
        <rect x={W / 2 - 54} y={H - 2} width="108" height="22" className="plate" />
        <text x={W / 2} y={H + 14} className="plate-text" textAnchor="middle">
          言葉の壁
        </text>

        <g className="tongue" style={{ transformOrigin: `${tongueX}px ${tongueY}px` }}>
          <polygon
            points={`${tongueX - 5},${tongueY} ${tongueX + 5},${tongueY} ${tongueX + 5},${tongueY + 36} ${tongueX + 15},${tongueY + 52} ${tongueX + 7},${tongueY + 52} ${tongueX},${tongueY + 42} ${tongueX - 7},${tongueY + 52} ${tongueX - 15},${tongueY + 52} ${tongueX - 5},${tongueY + 36}`}
            className="tongue-shape"
          />
        </g>
        {/* cracks */}
        {hpPct < 66 && (
          <polyline className="crack" points={`${W * 0.08},0 ${W * 0.13},${H * 0.2} ${W * 0.07},${H * 0.35} ${W * 0.15},${H * 0.55}`} />
        )}
        {hpPct < 33 && (
          <>
            <polyline className="crack" points={`${W * 0.93},${H} ${W * 0.86},${H * 0.75} ${W * 0.94},${H * 0.55} ${W * 0.88},${H * 0.3} ${W * 0.95},0`} />
            <polyline className="crack" points={`${W * 0.45},0 ${W * 0.5},${H * 0.12} ${W * 0.44},${H * 0.2}`} />
          </>
        )}
      </svg>
    </div>
  );
}
