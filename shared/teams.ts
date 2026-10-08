export const MAX_TEAM_SIZE = 5;

/**
 * Split `n` players into the fewest teams of at most MAX_TEAM_SIZE, with sizes differing by at
 * most one (21 → 5·4·4·4·4, never 5·5·5·5·1). Largest teams first.
 */
export function teamSizes(n: number): number[] {
  if (n <= 0) return [];
  const count = Math.ceil(n / MAX_TEAM_SIZE);
  const base = Math.floor(n / count);
  const extra = n % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

export const TEAM_NAMES: { ja: string; en: string }[] = [
  { ja: 'たこ焼き隊', en: 'Team Takoyaki' },
  { ja: '通天閣団', en: 'Team Tsutenkaku' },
  { ja: '鹿せんべい組', en: 'Team Shika Senbei' },
  { ja: '抹茶ブラザーズ', en: 'Team Matcha' },
  { ja: 'お好み焼き軍', en: 'Team Okonomiyaki' },
  { ja: '串カツ連合', en: 'Team Kushikatsu' },
  { ja: '琵琶湖クルー', en: 'Team Biwako' },
  { ja: '神戸ビーフ団', en: 'Team Kobe Beef' },
];

export const teamName = (i: number) => {
  const n = TEAM_NAMES[i % TEAM_NAMES.length];
  const lap = Math.floor(i / TEAM_NAMES.length);
  return lap ? { ja: `${n.ja}${lap + 1}`, en: `${n.en} ${lap + 1}` } : n;
};

/** Longer chains are harder, so they hit harder: damage scales with hops (1–2 hops = ×1, 5 hops = ×2.5). */
export const chainMultiplier = (hops: number) => Math.max(1, hops / 2);
