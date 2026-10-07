const COLS = 9;
const ROWS = 7;
const BW = 32;
const BH = 16;

/** Original pixel-style brick wall boss, drawn with SVG rects. */
export function Boss({ hpPct, hitKey }: { hpPct: number; hitKey: number }) {
  const bricks: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    const offset = r % 2 === 0 ? 0 : -BW / 2;
    for (let c = 0; c < COLS + 1; c++) {
      const x = offset + c * BW;
      const shade = (r * 7 + c * 3) % 5;
      bricks.push(
        <rect
          key={`${r}-${c}`}
          x={x + 1}
          y={r * BH + 1}
          width={BW - 2}
          height={BH - 2}
          className={`brick b${shade}`}
        />,
      );
    }
  }
  const w = COLS * BW;
  const h = ROWS * BH;

  return (
    <div className={`boss ${hpPct <= 0 ? 'dead' : ''}`}>
      <svg
        key={hitKey}
        className={hitKey ? 'boss-svg hit' : 'boss-svg'}
        viewBox={`-4 -4 ${w + 8} ${h + 8}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label="The Language Wall"
      >
        <defs>
          <clipPath id="wallclip">
            <rect x="0" y="0" width={w} height={h} />
          </clipPath>
        </defs>
        <rect x="-4" y="-4" width={w + 8} height={h + 8} className="wall-outline" />
        <g clipPath="url(#wallclip)">{bricks}</g>
        {/* eyes */}
        <g className="eyes">
          <rect x={w * 0.28} y={h * 0.3} width="22" height="10" className="eye" />
          <rect x={w * 0.62} y={h * 0.3} width="22" height="10" className="eye" />
          <rect x={w * 0.28 + 12} y={h * 0.3 + 2} width="6" height="6" className="pupil" />
          <rect x={w * 0.62 + 4} y={h * 0.3 + 2} width="6" height="6" className="pupil" />
          <rect x={w * 0.25} y={h * 0.3 - 6} width="28" height="4" className="brow" transform={`rotate(12 ${w * 0.25 + 14} ${h * 0.3 - 4})`} />
          <rect x={w * 0.6} y={h * 0.3 - 6} width="28" height="4" className="brow" transform={`rotate(-12 ${w * 0.6 + 14} ${h * 0.3 - 4})`} />
        </g>
        {/* name plate */}
        <rect x={w / 2 - 54} y={h * 0.62} width="108" height="22" className="plate" />
        <text x={w / 2} y={h * 0.62 + 16} className="plate-text" textAnchor="middle">
          言葉の壁
        </text>
        {/* cracks */}
        {hpPct < 66 && (
          <polyline className="crack" points={`${w * 0.15},0 ${w * 0.2},${h * 0.2} ${w * 0.14},${h * 0.35} ${w * 0.22},${h * 0.55}`} />
        )}
        {hpPct < 33 && (
          <>
            <polyline className="crack" points={`${w * 0.85},${h} ${w * 0.78},${h * 0.75} ${w * 0.86},${h * 0.55} ${w * 0.8},${h * 0.3} ${w * 0.88},0`} />
            <polyline className="crack" points={`${w * 0.45},${h} ${w * 0.5},${h * 0.88} ${w * 0.44},${h * 0.8}`} />
          </>
        )}
      </svg>
    </div>
  );
}
