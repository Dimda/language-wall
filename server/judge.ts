import type { JudgeResult, Lang, Tier } from '../shared/types';

/** Pluggable judge: swap `judge` below for an LLM / TypeSafe Jev implementation. */
export type Judge = (original: string, final: string, lang: Lang) => Promise<JudgeResult>;

export const normalize = (s: string): string =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '');

/** Mock: exact on normalized match, otherwise a random "dominant" verdict so all tiers show up. */
export const mockJudge: Judge = async (original, final) => {
  if (normalize(original) === normalize(final)) {
    return { exact: 1, same_concept: 0, related: 0, lost: 0 };
  }
  const r = Math.random();
  const dominant = r < 0.45 ? 'same_concept' : r < 0.8 ? 'related' : 'lost';
  const result: JudgeResult = { exact: Math.random() * 0.1, same_concept: 0, related: 0, lost: 0 };
  result[dominant] = 0.55 + Math.random() * 0.3;
  const others = (['same_concept', 'related', 'lost'] as const).filter((k) => k !== dominant);
  const rest = 1 - result.exact - result[dominant];
  const split = Math.random();
  result[others[0]] = rest * split;
  result[others[1]] = rest * (1 - split);
  return result;
};

export const WEIGHTS = { exact: 100, same_concept: 70, related: 30, lost: 0 } as const;
export const CRIT_THRESHOLD = 0.9;
export const CRIT_MULTIPLIER = 1.5;

export const BROKEN: JudgeResult = { exact: 0, same_concept: 0, related: 0, lost: 1 };

export function damageFrom(r: JudgeResult): { damage: number; tier: Tier } {
  const base =
    WEIGHTS.exact * r.exact + WEIGHTS.same_concept * r.same_concept + WEIGHTS.related * r.related + WEIGHTS.lost * r.lost;
  if (r.exact > CRIT_THRESHOLD) return { damage: Math.round(base * CRIT_MULTIPLIER), tier: 'perfect' };
  const tier: Tier = base >= 55 ? 'strong' : base >= 30 ? 'weak' : 'fizzle';
  return { damage: tier === 'fizzle' ? 0 : Math.round(base), tier };
}

/** The judge the game uses. */
export const judge: Judge = mockJudge;
