import type { Hop, ResolvedChain } from '../shared/types';

export const BOSS_HP_PER_PLAYER = 120;
export const PARTY_MAX_HP = 100;

/**
 * Boss behaviour. Future ideas (corruption of an in-flight chain, defense mini-game,
 * phases by HP) slot into `onChainHop` / `attackDamage`.
 */
export interface BossDef {
  name: string;
  /** Damage dealt on the boss turn, given this round's resolved spells. */
  attackDamage: (spells: ResolvedChain[]) => number;
  attackMessage: (damage: number) => string;
  /** Called with each submitted hop; may return a replacement text (e.g. corruption). */
  onChainHop?: (hop: Hop) => string | undefined;
}

export const LANGUAGE_WALL: BossDef = {
  name: '言葉の壁',
  attackDamage: (spells) =>
    8 + spells.reduce((sum, s) => sum + (s.tier === 'fizzle' ? 12 : s.tier === 'weak' ? 4 : 0), 0),
  attackMessage: (damage) =>
    damage > 20
      ? `言葉の壁 casts TOTAL MISUNDERSTANDING! Party takes ${damage} damage!`
      : `言葉の壁 casts MISUNDERSTANDING! Party takes ${damage} damage!`,
};
