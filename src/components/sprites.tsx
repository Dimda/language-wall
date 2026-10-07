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
    id: 'obachan',
    label: 'Osaka Obachan',
    labelJa: '大阪のおばちゃん',
    rows: {
      0: '..kHkHHkHk..',
      1: '.kHHHHHHHHk.',
      2: 'kHHHHHHHHHHk',
      3: 'kHHHHHHHHHHk',
      4: 'kHHHHHHHHHHk',
      5: 'kHHssssssHHk',
      6: '.kssessessk.',
      10: '..kABAABAk..',
      11: '.ksAAABAAsk.',
      12: '.kkBAAABAkk.',
      13: '..kAABAABk..',
    },
    // 飴ちゃん (candy) in hand
    pixels: [
      [11, 10, 'o'],
      [11, 11, 'o'],
      [10, 11, 'w'],
    ],
    palette: { ...common, H: '#a04ad0', A: '#e0a840', B: '#3a2410', C: '#7a3aa0', m: '#e0203a', o: '#ff6ab0', w: '#ffffff' },
  },
  {
    id: 'gaijin',
    label: 'Gaijin Dev',
    labelJa: '外国人エンジニア',
    rows: {
      1: '...kkkkkk...',
      2: '..kHHHHHHkH.',
      3: '.kHHHHHHHHHk',
      4: '.kHHHHHHHHk.',
      5: '.kHssssssHk.',
      6: '.kgegggegsk.',
      10: '..kAABBAAk..',
      11: '.ksAAAAAAsk.',
    },
    // laptop
    pixels: [
      [9, 11, 'x'],
      [10, 11, 'x'],
      [11, 11, 'x'],
      [10, 10, 'z'],
      [11, 10, 'z'],
      [11, 9, 'z'],
    ],
    palette: { ...common, s: '#f8d8c4', H: '#f0d060', A: '#5a6a7a', B: '#e8e8e8', C: '#2a3a5a', g: '#1a1a1a', x: '#c8d0dc', z: '#7ad8ff' },
  },
  {
    id: 'maiko',
    label: 'Kyoto Maiko',
    labelJa: '舞妓さん',
    rows: {
      1: '...kkkkkk...',
      2: '.kkHHHHHHkk.',
      3: '.kHHHHHHHHoo',
      4: '.kHHHHHHHHko',
      7: '.kssssssssk.',
      11: '.ksAABBAAsk.',
      12: '.kkABBBBAkk.',
    },
    pixels: [
      [11, 5, 'y'],
      [11, 6, 'y'],
    ],
    palette: { ...common, s: '#fbf6f2', H: '#14101a', A: '#d02a4a', B: '#e8c040', C: '#d02a4a', m: '#d0102a', o: '#ff8ac0', y: '#e8c040' },
  },
  {
    id: 'tourist',
    label: 'Backpacker',
    labelJa: '観光客',
    rows: {
      1: '...kkkkkk...',
      2: '..kRRRRRRk..',
      3: '.kRRRRRRRRRk',
      4: '.kHHHHHHHHk.',
      5: '.kHssssssHk.',
      11: '.ksAAxxAAsk.',
      14: '..kssk.kssk.',
    },
    // huge backpack + camera strap
    pixels: [
      [0, 9, 'p'],
      [0, 10, 'p'],
      [0, 11, 'p'],
      [0, 12, 'p'],
      [0, 13, 'p'],
      [1, 9, 'p'],
      [4, 10, 'k'],
      [7, 10, 'k'],
    ],
    palette: { ...common, s: '#e8b48a', H: '#6a3a1a', R: '#d83a2a', A: '#3aa0a0', B: '#3aa0a0', C: '#c8b080', x: '#141414', p: '#e8802a' },
  },
  {
    id: 'torafan',
    label: 'Tora-fan',
    labelJa: '虎党',
    rows: {
      2: '..kkHHHHkk..',
      3: '.kWWWWWWWWkW',
      10: '..kAKAAKAk..',
      11: '.ksKAAKAAsk.',
      12: '.kkAAKAAKkk.',
      13: '..kAKAAKAk..',
    },
    // megaphone
    pixels: [
      [10, 10, 'x'],
      [11, 9, 'x'],
      [11, 10, 'x'],
      [11, 11, 'x'],
      [11, 4, 'W'],
    ],
    palette: { ...common, H: '#1a1a1a', A: '#f0d020', K: '#141414', C: '#141414', W: '#f4f4f4', x: '#e84a3a' },
  },
  {
    id: 'eikaiwa',
    label: 'Eikaiwa Teacher',
    labelJa: '英会話の先生',
    rows: {
      0: '..kHkHHkHk..',
      1: '.kHHHHHHHHk.',
      2: '.kHHHHHHHHk.',
      7: '.kssssssssk.',
      8: '..kHHmmHHk..',
      10: '..kAABBAAk..',
      12: '.kkAABBAAkk.',
    },
    // textbook
    pixels: [
      [11, 10, 'b'],
      [11, 11, 'b'],
      [10, 10, 'w'],
      [10, 11, 'b'],
    ],
    palette: { ...common, s: '#8a5434', r: '#8a5434', H: '#1a1210', A: '#8a6a3a', B: '#f4f4f4', C: '#3a3a4a', b: '#c8303a', w: '#f4f4f4' },
  },
  {
    id: 'tsukkomi',
    label: 'Tsukkomi',
    labelJa: 'ツッコミ芸人',
    rows: {
      2: '..kkHHHHkk..',
      3: '.kHHHHHHHHk.',
      4: '.kHHssHHHHk.',
      10: '..kAAWWAAk..',
      11: '.ksAAWBAAsk.',
    },
    // ハリセン (paper fan)
    pixels: [
      [10, 4, 'x'],
      [11, 3, 'x'],
      [11, 4, 'f'],
      [10, 5, 'f'],
      [11, 5, 'x'],
      [10, 6, 'x'],
      [11, 6, 'f'],
      [10, 7, 'f'],
      [10, 8, 'y'],
      [10, 9, 'y'],
    ],
    palette: { ...common, H: '#2a1a14', A: '#2a4ab0', B: '#e02a3a', C: '#1a2a6a', W: '#f4f4f4', x: '#ffffff', f: '#d8d8d8', y: '#8a5a2a' },
  },
  {
    id: 'otaku',
    label: 'Nipponbashi Otaku',
    labelJa: '日本橋のオタク',
    rows: {
      2: '..kkHHHHkkH.',
      3: '.kHHHHHHHHkH',
      6: '.kgegggegsk.',
      7: '.ksfssssfsk.',
    },
    // poster tubes sticking out of the backpack
    pixels: [
      [0, 5, 'p'],
      [0, 6, 'p'],
      [0, 7, 'p'],
      [0, 8, 'p'],
      [1, 4, 'q'],
      [1, 5, 'q'],
      [0, 10, 'K'],
      [0, 11, 'K'],
      [0, 12, 'K'],
    ],
    palette: {
      ...common,
      s: '#fbe0d0',
      H: '#d8642a',
      A: '#ff8ac8',
      B: '#ffffff',
      C: '#3a4a7a',
      g: '#1a1a1a',
      f: '#d89070',
      p: '#f0e0a0',
      q: '#8ad8ff',
      K: '#2a2a3a',
    },
  },
  {
    id: 'takoyaki',
    label: 'Takoyaki-ya',
    labelJa: 'たこ焼き屋',
    rows: {
      3: '.kWWWWWWWWkW',
      10: '..kAAAAAAk..',
      11: '.ksBBBBBBsk.',
      12: '.kkBBBBBBkk.',
      13: '..kBBBBBBk..',
    },
    // tray of takoyaki
    pixels: [
      [9, 11, 't'],
      [10, 11, 't'],
      [11, 11, 't'],
      [9, 10, 'o'],
      [10, 10, 'o'],
      [11, 10, 'o'],
      [11, 4, 'W'],
    ],
    palette: { ...common, H: '#1a1a1a', A: '#f4f4f4', B: '#2a4a8a', C: '#3a3a3a', W: '#f4f4f4', t: '#6a4a2a', o: '#c8803a' },
  },
  {
    id: 'yukata',
    label: 'Yukata Debut',
    labelJa: '浴衣デビュー',
    rows: {
      10: '..kABAAABk..',
      11: '.ksAOOOOAsk.',
      12: '.kkBAAABAkk.',
      13: '..kAABAAAk..',
    },
    // braid + uchiwa fan
    pixels: [
      [1, 6, 'H'],
      [1, 7, 'H'],
      [1, 8, 'H'],
      [0, 9, 'H'],
      [0, 10, 'O'],
      [10, 8, 'u'],
      [11, 8, 'u'],
      [10, 9, 'u'],
      [11, 9, 'u'],
      [11, 10, 'y'],
    ],
    palette: { ...common, s: '#f2c8a8', H: '#a0522d', A: '#2a5ab0', B: '#f4f4f4', O: '#e8c040', C: '#2a5ab0', u: '#ff5a5a', y: '#c8a060' },
  },
  {
    id: 'shika',
    label: 'Nara Deer',
    labelJa: '奈良の鹿',
    rows: {
      0: '.k.k....k.k.',
      1: '..kak..kak..',
      2: '...kakkak...',
      3: '..kkFFFFkk..',
      4: 'kFkFFFFFFkFk',
      5: '.kkFFFFFFkk.',
      6: '..kFeFFeFk..',
      7: '..kFFFFFFk..',
      8: '...kFnnFk...',
      9: '....kkkk....',
      10: '..kFFwFFFk..',
      11: '.kFFFFFwFFk.',
      12: '.kkFwFFFFkk.',
      13: '..kFFFFwFk..',
      14: '..kFFkkFFk..',
    },
    palette: { ...common, F: '#b8783a', a: '#e8d8b0', w: '#fff6e0', n: '#1a1010' },
  },
  {
    id: 'ninja',
    label: 'Koka Ninja',
    labelJa: '甲賀忍者',
    rows: {
      3: '.kBBBBBBBBkB',
      7: '.kHHHHHHHHk.',
      8: '..kHHHHHHk..',
    },
    pixels: [[11, 4, 'B']],
    palette: { ...common, H: '#2a2a40', A: '#2a2a40', B: '#d83a3a', C: '#1a1a28' },
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
