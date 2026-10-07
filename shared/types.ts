export type Lang = 'ja' | 'en';

export const otherLang = (lang: Lang): Lang => (lang === 'ja' ? 'en' : 'ja');

export type Phase = 'lobby' | 'battle' | 'victory' | 'defeat';

/** Sub-state of a battle: party casts → spells resolve one by one → boss strikes back → short pause. */
export type Turn = 'casting' | 'resolving' | 'boss' | 'intermission';

export const AVATAR_IDS = ['samurai', 'mage', 'ninja', 'kitsune', 'robot', 'miko'] as const;
export type AvatarId = (typeof AVATAR_IDS)[number];

export const ELEMENTS = ['fire', 'ice', 'thunder', 'wind', 'light', 'shadow'] as const;
export type Element = (typeof ELEMENTS)[number];

export type Tier = 'perfect' | 'strong' | 'weak' | 'fizzle';

export interface PlayerPublic {
  id: string;
  name: string;
  avatar: AvatarId;
  connected: boolean;
  isHost: boolean;
  isBot: boolean;
  typing: boolean;
}

export interface Term {
  id: string;
  text: string;
  lang: Lang;
}

export interface Hop {
  playerId: string;
  playerName: string;
  fromLang: Lang;
  toLang: Lang;
  input: string;
  output?: string;
}

/** What everyone may see about an in-flight chain (no texts). */
export interface ChainPublic {
  id: string;
  element: Element;
  /** Player id for each hop, in order (a player can appear twice in small parties). */
  order: string[];
  /** Index of the hop currently being cast. */
  hopIndex: number;
  hopEndsAt: number | null;
  status: 'casting' | 'done' | 'fizzled';
}

export interface JudgeResult {
  exact: number;
  same_concept: number;
  related: number;
  lost: number;
}

export interface ResolvedChain {
  id: string;
  element: Element;
  term: Term;
  hops: Hop[];
  /** Player ids that cast this spell. */
  casters: string[];
  final: string;
  judge: JudgeResult;
  damage: number;
  tier: Tier;
  /** True when the chain broke (timeout / disconnect) before finishing. */
  broken: boolean;
}

/** Client-side timeline for a resolution; all offsets in ms from receipt. */
export interface ResolveTimeline {
  chain: ResolvedChain;
  index: number;
  total: number;
  revealMs: number;
  judgeMs: number;
  /** Spell animation starts at revealMs + judgeMs; impact lands IMPACT_MS after that. */
  spellMs: number;
}

export const IMPACT_MS = 1300;

export interface LogEntry {
  id: number;
  text: string;
  kind: 'info' | 'damage' | 'crit' | 'boss' | 'system' | 'fizzle';
}

export interface Snapshot {
  phase: Phase;
  turn: Turn;
  round: number;
  players: PlayerPublic[];
  hopCount: number;
  boss: { hp: number; maxHp: number };
  party: { hp: number; maxHp: number };
  chains: ChainPublic[];
  log: LogEntry[];
  devMode: boolean;
}

export interface Task {
  chainId: string;
  element: Element;
  hopIndex: number;
  hopCount: number;
  prevText: string;
  fromLang: Lang;
  toLang: Lang;
  endsAt: number;
}
