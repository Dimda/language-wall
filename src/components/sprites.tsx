import { memo } from 'react';
import type { AvatarId, Element } from '../../shared/types';

/**
 * Original 12×16 chibi fighters. Each avatar overrides some rows of a shared body template and
 * maps palette letters to colors: k outline, s skin, e eye, m mouth, r blush, H hair/hat,
 * A body, B belt/accent, C legs, x/y/o props.
 */
const BASE = [
  '............',
  '....kkkk....',
  '..kkHHHHkk..',
  '.kHHHHHHHHk.',
  '.kHHHHHHHHk.',
  '.kHssssssHk.',
  '.kssessessk.',
  '.ksrssssrsk.',
  '..kssmmssk..',
  '...kkkkkk...',
  '..kAAAAAAk..',
  '.ksAABBAAsk.',
  '.kkAAAAAAkk.',
  '..kAAAAAAk..',
  '..kCCkkCCk..',
  '..kkk..kkk..',
];

interface AvatarDef {
  id: AvatarId;
  label: string;
  labelJa: string;
  rows: Record<number, string>;
  pixels?: [number, number, string][];
  palette: Record<string, string>;
}

const common = { k: '#0b0b14', s: '#f6c9a0', e: '#1a1020', m: '#a0404a', r: '#f49a9a' };

export const AVATARS: AvatarDef[] = [
  {
    id: 'samurai',
    label: 'Samurai',
    labelJa: '侍',
    rows: { 0: '.....kk.....', 1: '....kHHk....', 2: '..kkHHHHkk..' },
    pixels: [
      [11, 8, 'y'],
      [11, 9, 'x'],
      [11, 10, 'x'],
      [11, 11, 'x'],
      [11, 12, 'x'],
      [10, 11, 'y'],
    ],
    palette: { ...common, H: '#26263a', A: '#c8303a', B: '#e8c040', C: '#33334d', x: '#e8eef8', y: '#7a4a20' },
  },
  {
    id: 'mage',
    label: 'Mage',
    labelJa: '魔法使い',
    rows: {
      0: '.....kk.....',
      1: '....kHHk....',
      2: '...kHHHHk...',
      3: '..kHHBBHHk..',
      4: 'kkHHHHHHHHkk',
      5: '.khsssssshk.',
    },
    pixels: [
      [11, 4, 'o'],
      [11, 5, 'y'],
      [11, 6, 'y'],
      [11, 7, 'y'],
      [11, 8, 'y'],
      [11, 9, 'y'],
      [11, 10, 'y'],
      [11, 11, 'y'],
      [11, 12, 'y'],
      [11, 13, 'y'],
    ],
    palette: { ...common, H: '#4a3aa8', h: '#e8e0f0', A: '#4a3aa8', B: '#e8c040', C: '#2a2050', y: '#8a5a2a', o: '#7af0ff' },
  },
  {
    id: 'ninja',
    label: 'Ninja',
    labelJa: '忍者',
    rows: {
      3: '.kBBBBBBBBkB',
      7: '.kHHHHHHHHk.',
      8: '..kHHHHHHk..',
    },
    pixels: [[11, 4, 'B']],
    palette: { ...common, H: '#2a2a40', A: '#2a2a40', B: '#d83a3a', C: '#1a1a28', s: '#f6c9a0' },
  },
  {
    id: 'kitsune',
    label: 'Kitsune',
    labelJa: '狐',
    rows: {
      0: '.kk......kk.',
      1: '.kHk....kHk.',
      2: '.kHHkkkkHHk.',
    },
    pixels: [
      [10, 13, 'H'],
      [11, 12, 'H'],
      [11, 13, 'H'],
      [11, 14, 'w'],
      [10, 14, 'H'],
      [2, 1, 'w'],
      [9, 1, 'w'],
    ],
    palette: { ...common, H: '#f08a2a', A: '#f4f0e8', B: '#c8303a', C: '#c8303a', w: '#fff4e0' },
  },
  {
    id: 'robot',
    label: 'Robot',
    labelJa: 'ロボ',
    rows: {
      0: '.....ko.....',
      1: '.....kk.....',
      2: '..kkkkkkkk..',
      5: '.kHHHHHHHHk.',
      6: '.kHvvvvvvHk.',
      7: '.kHvevvevHk.',
      8: '..kHHHHHHk..',
      11: '.kHAABBAAHk.',
    },
    palette: { ...common, H: '#a8b0c0', A: '#6a7aa0', B: '#40e0ff', C: '#505870', v: '#1a3a4a', e: '#40e0ff', o: '#ff4a5a' },
  },
  {
    id: 'miko',
    label: 'Miko',
    labelJa: '巫女',
    rows: { 1: '...kkBBkk...' },
    pixels: [
      [1, 6, 'H'],
      [1, 7, 'H'],
      [1, 8, 'H'],
      [10, 6, 'H'],
      [10, 7, 'H'],
      [10, 8, 'H'],
      [11, 7, 'y'],
      [11, 8, 'y'],
      [11, 9, 'y'],
      [11, 10, 'y'],
      [11, 11, 'y'],
      [10, 6, 'w'],
      [11, 6, 'w'],
    ],
    palette: { ...common, H: '#1a1a2a', A: '#f4f0e8', B: '#c8303a', C: '#c8303a', y: '#c8a060', w: '#ffffff' },
  },
];

export const avatarDef = (id: AvatarId): AvatarDef => AVATARS.find((a) => a.id === id) ?? AVATARS[0];

function grid(def: AvatarDef): string[][] {
  const rows = BASE.map((r, i) => [...(def.rows[i] ?? r)]);
  for (const [x, y, c] of def.pixels ?? []) rows[y][x] = c;
  return rows;
}

export const Sprite = memo(function Sprite({ avatar, size = 64 }: { avatar: AvatarId; size?: number }) {
  const def = avatarDef(avatar);
  const rects: React.ReactNode[] = [];
  grid(def).forEach((row, y) =>
    row.forEach((c, x) => {
      const fill = def.palette[c];
      if (c !== '.' && fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={fill} />);
    }),
  );
  return (
    <svg
      className="sprite"
      viewBox="0 0 12 16"
      width={size * 0.75}
      height={size}
      shapeRendering="crispEdges"
      aria-label={def.label}
    >
      {rects}
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
