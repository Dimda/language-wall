export type Lang = 'ja' | 'en';

export const otherLang = (lang: Lang): Lang => (lang === 'ja' ? 'en' : 'ja');

export type Phase = 'lobby' | 'battle' | 'victory' | 'defeat';

/** Sub-state of a battle: party casts → spells resolve one by one → boss strikes back → short pause. */
export type Turn = 'casting' | 'resolving' | 'boss' | 'intermission';

export const AVATAR_IDS = [
  'obachan',
  'gaijin',
  'maiko',
  'tourist',
  'torafan',
  'eikaiwa',
  'sumo',
  'otaku',
  'takoyaki',
  'yukata',
  'shika',
  'ninja',
] as const;
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

/** Text split into plain runs and [kanji, hiragana reading] pairs, rendered as <ruby> furigana. */
export type Ruby = (string | [string, string])[];

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
  /** Furigana for a Japanese `output`. */
  outputRuby?: Ruby;
}

/** A team of up to 5 that casts one chain together each round; its element is its colour. */
export interface TeamPublic {
  id: string;
  name: string;
  nameEn: string;
  element: Element;
  members: string[];
}

/** What everyone may see about an in-flight chain (no texts). */
export interface ChainPublic {
  id: string;
  teamId: string;
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
  /** How sure the judge is of its verdict, 0–1 (Jev's answer confidence). */
  confidence?: number;
}

export interface ResolvedChain {
  id: string;
  /** Furigana for a Japanese term. */
  termRuby?: Ruby;
  teamId: string;
  teamName: string;
  element: Element;
  term: Term;
  hops: Hop[];
  /** Player ids that cast this spell. */
  casters: string[];
  final: string;
  judge: JudgeResult;
  damage: number;
  /** Damage multiplier from chain length (hops / 2). */
  multiplier: number;
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
  kind: 'info' | 'damage' | 'crit' | 'boss' | 'system' | 'fizzle' | 'verdict';
}

export interface Snapshot {
  phase: Phase;
  turn: Turn;
  round: number;
  players: PlayerPublic[];
  teams: TeamPublic[];
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
  /** Furigana for a Japanese `prevText`. */
  prevRuby?: Ruby;
  fromLang: Lang;
  toLang: Lang;
  endsAt: number;
}
