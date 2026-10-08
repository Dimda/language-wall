import { checkAnswer, type Rejection } from '../shared/guard';
import { chainMultiplier, MAX_PLAYERS, MAX_TEAM_SIZE, teamName, teamSizes } from '../shared/teams';
import { WORDS } from '../shared/words';
import {
  AVATAR_IDS,
  type AvatarId,
  type ChainPublic,
  ELEMENTS,
  type Element,
  type Hop,
  IMPACT_MS,
  type Lang,
  type LogEntry,
  otherLang,
  type Phase,
  type ResolvedChain,
  type ResolveTimeline,
  type Snapshot,
  type Task,
  type TeamPublic,
  type Term,
  type Turn,
} from '../shared/types';
import { BOSS_HP_PER_PLAYER, type BossDef, LANGUAGE_WALL, PARTY_MAX_HP } from './boss';
import { BROKEN, damageFrom, type Judge, judge as defaultJudge } from './judge';

export interface Outbox {
  snapshot(s: Snapshot): void;
  task(playerId: string, t: Task | null): void;
  resolve(t: ResolveTimeline): void;
  bossAttack(damage: number): void;
  /** A player's answer was refused (copied the word / wrong language); tell only them why. */
  rejected?(playerId: string, reason: Rejection): void;
}

export interface Timing {
  hopMs: number;
  revealBaseMs: number;
  revealPerHopMs: number;
  judgeMs: number;
  spellMs: number;
  pauseMs: number;
  bossMs: number;
  intermissionMs: number;
  bannerMs: number;
  /** Time the boss death animation gets before the victory screen. */
  bossDeathMs: number;
  botMinMs: number;
  botMaxMs: number;
}

export const DEFAULT_TIMING: Timing = {
  hopMs: 45_000,
  revealBaseMs: 1200,
  revealPerHopMs: 1600,
  judgeMs: 2000,
  spellMs: 3000,
  pauseMs: 1200,
  bossMs: 2800,
  intermissionMs: 2600,
  bannerMs: 1800,
  bossDeathMs: 5200,
  botMinMs: 2500,
  botMaxMs: 6000,
};

export interface GameOptions {
  judge?: Judge;
  boss?: BossDef;
  devMode?: boolean;
  timing?: Partial<Timing>;
}

interface Player {
  id: string;
  name: string;
  avatar: AvatarId;
  connected: boolean;
  isBot: boolean;
  joinedAt: number;
  typing: boolean;
}

interface Team {
  id: string;
  name: string;
  nameEn: string;
  element: Element;
  members: string[];
}

interface Chain {
  id: string;
  teamId: string;
  element: Element;
  term: Term;
  order: string[];
  hops: Hop[];
  status: 'casting' | 'done' | 'fizzled';
  hopEndsAt: number | null;
  timer?: ReturnType<typeof setTimeout>;
}

const MAX_TEXT = 200;
const MAX_LOG = 30;
const BOT_NAMES = ['ボット太郎', 'Botty', 'ロボ子', 'Clanker'];

export class Game {
  phase: Phase = 'lobby';
  turn: Turn = 'casting';
  round = 0;
  bossHp = 0;
  bossMaxHp = 0;
  partyHp = PARTY_MAX_HP;

  private players = new Map<string, Player>();
  private teams: Team[] = [];
  private chains: Chain[] = [];
  private log: LogEntry[] = [];
  private logSeq = 0;
  private chainSeq = 0;
  private joinSeq = 0;
  private recentTerms: string[] = [];
  private timers = new Set<ReturnType<typeof setTimeout>>();

  private readonly judge: Judge;
  private readonly boss: BossDef;
  private readonly devMode: boolean;
  readonly timing: Timing;

  constructor(
    private readonly out: Outbox,
    opts: GameOptions = {},
  ) {
    this.judge = opts.judge ?? defaultJudge;
    this.boss = opts.boss ?? LANGUAGE_WALL;
    this.devMode = opts.devMode ?? false;
    this.timing = { ...DEFAULT_TIMING, ...opts.timing };
  }

  // ── players ──────────────────────────────────────────────

  hasPlayer(id: string): boolean {
    return this.players.has(id);
  }

  /** Connected players, bots included — what the MAX_PLAYERS cap counts. */
  private headcount(): number {
    return this.activePlayers().length;
  }

  join(id: string, name: string, avatar: AvatarId): void {
    if (!this.players.has(id) && this.headcount() >= MAX_PLAYERS) return; // party is full
    const clean = name.trim().slice(0, 16) || 'Anon';
    const av = AVATAR_IDS.includes(avatar) ? avatar : AVATAR_IDS[0];
    const existing = this.players.get(id);
    if (existing) {
      Object.assign(existing, { name: clean, avatar: av, connected: true });
    } else {
      this.players.set(id, {
        id,
        name: clean,
        avatar: av,
        connected: true,
        isBot: false,
        joinedAt: this.joinSeq++,
        typing: false,
      });
      const team = this.phase === 'battle' ? this.placeInTeam(id) : null;
      this.addLog(
        team ? `${clean} rushes in and joins ${team.nameEn}! (casts next round)` : `${clean} joined the party!`,
        'info',
      );
    }
    this.broadcast();
  }

  reconnect(id: string): void {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = true;
    this.broadcast();
    this.out.task(id, this.taskFor(id));
  }

  disconnect(id: string): void {
    const p = this.players.get(id);
    if (!p) return;
    p.connected = false;
    p.typing = false;
    if (this.phase === 'lobby') {
      this.players.delete(id);
    } else {
      const chain = this.currentChainOf(id);
      if (chain) this.fizzle(chain, `${p.name} vanished… the spell fizzled!`);
    }
    this.broadcast();
  }

  setTyping(id: string, typing: boolean): void {
    const p = this.players.get(id);
    if (!p || p.typing === typing) return;
    p.typing = typing && !!this.currentChainOf(id);
    this.broadcast();
  }

  addBot(): void {
    if (!this.devMode || this.headcount() >= MAX_PLAYERS) return;
    const n = [...this.players.values()].filter((p) => p.isBot).length;
    const id = `bot-${n}-${Date.now()}`;
    const name = BOT_NAMES[n % BOT_NAMES.length] + (n >= BOT_NAMES.length ? n : '');
    this.players.set(id, {
      id,
      name,
      avatar: AVATAR_IDS[(n + 1) % AVATAR_IDS.length],
      connected: true,
      isBot: true,
      joinedAt: this.joinSeq++,
      typing: false,
    });
    const team = this.phase === 'battle' ? this.placeInTeam(id) : null;
    this.addLog(team ? `${name} joins ${team.nameEn}!` : `${name} joined the party!`, 'info');
    this.broadcast();
  }

  hostId(): string | null {
    const humans = [...this.players.values()].filter((p) => !p.isBot && p.connected);
    humans.sort((a, b) => a.joinedAt - b.joinedAt);
    return humans[0]?.id ?? null;
  }

  // ── lifecycle ────────────────────────────────────────────

  start(byId: string): void {
    if (this.phase !== 'lobby' || byId !== this.hostId()) return;
    const active = this.activePlayers();
    if (active.length === 0) return;
    this.formTeams(active);
    this.phase = 'battle';
    this.round = 0;
    this.bossMaxHp = BOSS_HP_PER_PLAYER * active.length;
    this.bossHp = this.bossMaxHp;
    this.partyHp = PARTY_MAX_HP;
    this.log = [];
    this.addLog(`${this.boss.name} blocks the way! Build the bridge!`, 'system');
    this.addLog(`${this.teams.length} team${this.teams.length > 1 ? 's' : ''} formed: ${this.teams.map((t) => `${t.nameEn} (${t.members.length})`).join(', ')}`, 'info');
    this.startRound();
  }

  restart(byId: string): void {
    if (this.phase === 'lobby' || byId !== this.hostId()) return;
    this.stopAll();
    for (const [id, p] of this.players) if (!p.connected) this.players.delete(id);
    this.chains = [];
    this.teams = [];
    this.log = [];
    this.round = 0;
    this.phase = 'lobby';
    this.turn = 'casting';
    this.broadcast();
  }

  private end(phase: 'victory' | 'defeat'): void {
    this.phase = phase;
    this.stopAll();
    this.addLog(
      phase === 'victory' ? '言葉の壁 crumbles! A bridge forms across Kansai!' : 'The party fell silent… the wall stands.',
      'system',
    );
    this.broadcast();
  }

  private stopAll(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
    for (const c of this.chains) {
      if (c.timer) clearTimeout(c.timer);
      const caster = c.status === 'casting' ? c.order[c.hops.length] : undefined;
      if (caster) this.out.task(caster, null);
    }
    for (const p of this.players.values()) p.typing = false;
  }

  private later(ms: number, fn: () => void): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }

  // ── rounds ───────────────────────────────────────────────

  /** Split players into the fewest teams of ≤ MAX_TEAM_SIZE with sizes differing by at most one. */
  private formTeams(players: Player[]): void {
    const pool = shuffle(players);
    let next = 0;
    this.teams = teamSizes(pool.length).map((size, i) => {
      const name = teamName(i);
      return {
        id: `t${i + 1}`,
        name: name.ja,
        nameEn: name.en,
        element: ELEMENTS[i % ELEMENTS.length],
        members: pool.slice(next, (next += size)).map((p) => p.id),
      };
    });
  }

  /** Late joiner: smallest team with room, or a new team when every team is full. */
  private placeInTeam(playerId: string): Team {
    const connected = (t: Team) => t.members.filter((id) => this.players.get(id)?.connected).length;
    const open = this.teams.filter((t) => connected(t) < MAX_TEAM_SIZE).sort((a, b) => connected(a) - connected(b));
    let team = open[0];
    if (!team) {
      const i = this.teams.length;
      const name = teamName(i);
      team = { id: `t${i + 1}`, name: name.ja, nameEn: name.en, element: ELEMENTS[i % ELEMENTS.length], members: [] };
      this.teams.push(team);
    }
    team.members.push(playerId);
    return team;
  }

  private startRound(): void {
    this.round++;
    this.turn = 'casting';
    this.chains = [];
    for (const team of this.teams) {
      // Fresh order each round so a different teammate gets the first word. Everyone translates once.
      const present = shuffle(team.members.filter((id) => this.players.get(id)?.connected));
      if (present.length === 0) continue;
      this.chains.push({
        id: `c${++this.chainSeq}`,
        teamId: team.id,
        element: team.element,
        term: this.drawTerm(),
        order: present,
        hops: [],
        status: 'casting',
        hopEndsAt: null,
      });
    }
    this.addLog(`— ROUND ${this.round} — Cast your spells!`, 'system');
    for (const c of this.chains) this.startHop(c);
    this.broadcast();
  }

  private startHop(c: Chain): void {
    const casterId = c.order[c.hops.length];
    const caster = this.players.get(casterId);
    if (!caster?.connected) {
      this.fizzle(c, `${caster?.name ?? 'Someone'} isn't here… the spell fizzled!`);
      return;
    }
    c.hopEndsAt = Date.now() + this.timing.hopMs;
    const hopIndex = c.hops.length;
    c.timer = setTimeout(() => {
      if (c.status === 'casting' && c.hops.length === hopIndex) {
        this.fizzle(c, `${caster.name} hesitated… the spell fizzled!`);
        this.broadcast();
      }
    }, this.timing.hopMs);
    const task = this.taskFor(casterId);
    if (task) this.out.task(casterId, task);

    if (caster.isBot) {
      caster.typing = true;
      const { botMinMs, botMaxMs } = this.timing;
      this.later(botMinMs + Math.random() * (botMaxMs - botMinMs), () => {
        if (task) this.submit(casterId, c.id, botAnswer(task));
      });
    }
  }

  submit(playerId: string, chainId: string, text: string): void {
    const p = this.players.get(playerId);
    const c = this.chains.find((x) => x.id === chainId);
    const clean = text.trim().slice(0, MAX_TEXT);
    if (this.phase !== 'battle' || this.turn !== 'casting' || !p || !c || !clean) return;
    if (c.status !== 'casting' || c.order[c.hops.length] !== playerId) return;

    const hopIndex = c.hops.length;
    const fromLang = hopLang(c, hopIndex);
    if (!p.isBot) {
      const reason = checkAnswer(hopInput(c, hopIndex), clean, otherLang(fromLang));
      if (reason) {
        this.out.rejected?.(playerId, reason);
        return;
      }
    }
    const hop: Hop = {
      playerId,
      playerName: p.name,
      fromLang,
      toLang: otherLang(fromLang),
      input: hopInput(c, hopIndex),
      output: clean,
    };
    hop.output = this.boss.onChainHop?.(hop) ?? hop.output;
    c.hops.push(hop);
    if (c.timer) clearTimeout(c.timer);
    p.typing = false;
    this.out.task(playerId, null);

    if (c.hops.length >= c.order.length) {
      c.status = 'done';
      c.hopEndsAt = null;
      this.addLog(`${spellName(c.element)} is fully charged!`, 'info');
      this.checkRoundComplete();
    } else {
      this.startHop(c);
    }
    this.broadcast();
  }

  private fizzle(c: Chain, message: string): void {
    if (c.status !== 'casting') return;
    if (c.timer) clearTimeout(c.timer);
    const casterId = c.order[c.hops.length];
    const caster = this.players.get(casterId);
    if (caster) caster.typing = false;
    this.out.task(casterId, null);
    c.status = 'fizzled';
    c.hopEndsAt = null;
    this.addLog(message, 'fizzle');
    this.checkRoundComplete();
  }

  private checkRoundComplete(): void {
    if (this.turn !== 'casting' || this.chains.some((c) => c.status === 'casting')) return;
    void this.resolveRound();
  }

  private async resolveRound(): Promise<void> {
    this.turn = 'resolving';
    const round = this.round;
    this.broadcast();

    const spells = await Promise.all(this.chains.map((c) => this.judgeChain(c)));
    if (this.phase !== 'battle' || this.round !== round) return;

    const t = this.timing;
    const revealPerHop = spells.length > 3 ? Math.round(t.revealPerHopMs * 0.6) : t.revealPerHopMs;
    // Leave room for the "SPELLS UNLEASHED" banner before the first spell.
    let at = t.bannerMs;
    spells.forEach((spell, index) => {
      const revealMs = t.revealBaseMs + revealPerHop * spell.hops.length;
      const timeline: ResolveTimeline = {
        chain: spell,
        index,
        total: spells.length,
        revealMs,
        judgeMs: t.judgeMs,
        spellMs: t.spellMs,
      };
      this.later(at, () => this.out.resolve(timeline));
      this.later(at + revealMs + t.judgeMs + IMPACT_MS, () => this.impact(spell));
      at += revealMs + t.judgeMs + t.spellMs + t.pauseMs;
    });
    this.later(at, () => this.bossTurn(spells));
  }

  private async judgeChain(c: Chain): Promise<ResolvedChain> {
    const final = c.hops[c.hops.length - 1]?.output ?? '';
    const broken = c.status !== 'done';
    const result = broken ? BROKEN : await this.judge(c.term.text, final, c.term.lang);
    const multiplier = chainMultiplier(c.order.length);
    const base = broken ? { damage: 0, tier: 'fizzle' as const } : damageFrom(result);
    const team = this.teams.find((t) => t.id === c.teamId);
    return {
      id: c.id,
      teamId: c.teamId,
      teamName: team?.nameEn ?? '',
      element: c.element,
      term: c.term,
      hops: c.hops,
      casters: [...new Set(c.order)],
      final,
      judge: result,
      damage: Math.round(base.damage * multiplier),
      multiplier,
      tier: base.tier,
      broken,
    };
  }

  private impact(spell: ResolvedChain): void {
    const names = spell.teamName || spell.hops.map((h) => h.playerName).join(' → ') || '???';
    if (spell.tier === 'fizzle') {
      this.addLog(`${names}: ${spell.term.text}… lost in translation. The spell fizzles!`, 'fizzle');
    } else {
      this.bossHp = Math.max(0, this.bossHp - spell.damage);
      const bonus = spell.multiplier > 1 ? ` ${spell.hops.length}-hop chain ×${spell.multiplier}!` : '';
      this.addLog(
        `${names} cast ${spellName(spell.element)} — ${spell.term.text}! ${spell.tier === 'perfect' ? 'PERFECT! ' : ''}${spell.damage} damage!${bonus}`,
        spell.tier === 'perfect' ? 'crit' : 'damage',
      );
    }
    if (this.bossHp <= 0) this.bossDefeated();
    else this.broadcast();
  }

  /** Killing blow: cancel the rest of the round, let clients play the death, then declare victory. */
  private bossDefeated(): void {
    this.stopAll();
    this.addLog(`${this.boss.name} is crumbling!! 言葉の壁が崩れていく…`, 'crit');
    this.broadcast();
    this.later(this.timing.bossDeathMs, () => this.end('victory'));
  }

  private bossTurn(spells: ResolvedChain[]): void {
    if (this.phase !== 'battle') return;
    this.turn = 'boss';
    const damage = this.boss.attackDamage(spells);
    this.partyHp = Math.max(0, this.partyHp - damage);
    this.addLog(this.boss.attackMessage(damage), 'boss');
    this.out.bossAttack(damage);
    this.broadcast();
    this.later(this.timing.bossMs, () => {
      if (this.partyHp <= 0) {
        this.end('defeat');
        return;
      }
      this.turn = 'intermission';
      this.broadcast();
      this.later(this.timing.intermissionMs, () => this.startRound());
    });
  }

  // ── helpers ──────────────────────────────────────────────

  private currentChainOf(playerId: string): Chain | undefined {
    return this.chains.find((c) => c.status === 'casting' && c.order[c.hops.length] === playerId);
  }

  private taskFor(playerId: string): Task | null {
    const c = this.currentChainOf(playerId);
    if (!c || c.hopEndsAt === null) return null;
    const hopIndex = c.hops.length;
    const fromLang = hopLang(c, hopIndex);
    return {
      chainId: c.id,
      element: c.element,
      hopIndex,
      hopCount: c.order.length,
      prevText: hopInput(c, hopIndex),
      fromLang,
      toLang: otherLang(fromLang),
      endsAt: c.hopEndsAt,
    };
  }

  private drawTerm(): Term {
    const fresh = WORDS.filter((w) => !this.recentTerms.includes(w.id));
    const pool = fresh.length > 0 ? fresh : WORDS;
    const term = pool[Math.floor(Math.random() * pool.length)];
    this.recentTerms = [...this.recentTerms, term.id].slice(-Math.floor(WORDS.length / 2));
    return term;
  }

  private activePlayers(): Player[] {
    return [...this.players.values()].filter((p) => p.connected);
  }

  private addLog(text: string, kind: LogEntry['kind']): void {
    this.log = [...this.log, { id: ++this.logSeq, text, kind }].slice(-MAX_LOG);
  }

  snapshot(): Snapshot {
    const host = this.hostId();
    return {
      phase: this.phase,
      turn: this.turn,
      round: this.round,
      players: [...this.players.values()]
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .map((p) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          connected: p.connected,
          isHost: p.id === host,
          isBot: p.isBot,
          typing: p.typing,
        })),
      teams: this.teams.map((t): TeamPublic => ({ ...t, members: [...t.members] })),
      boss: { hp: this.bossHp, maxHp: this.bossMaxHp },
      party: { hp: this.partyHp, maxHp: PARTY_MAX_HP },
      chains: this.chains.map(
        (c): ChainPublic => ({
          id: c.id,
          teamId: c.teamId,
          element: c.element,
          order: c.order,
          hopIndex: c.hops.length,
          hopEndsAt: c.hopEndsAt,
          status: c.status,
        }),
      ),
      log: this.log,
      devMode: this.devMode,
    };
  }

  broadcast(): void {
    this.out.snapshot(this.snapshot());
  }
}

export function spellName(e: Element): string {
  return { fire: 'Flame', ice: 'Frost', thunder: 'Thunder', wind: 'Gale', light: 'Radiance', shadow: 'Shadow' }[e];
}

function hopLang(c: Chain, hopIndex: number): Lang {
  return hopIndex % 2 === 0 ? c.term.lang : otherLang(c.term.lang);
}

function hopInput(c: Chain, hopIndex: number): string {
  return hopIndex === 0 ? c.term.text : (c.hops[hopIndex - 1].output ?? '');
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function botAnswer(t: Task): string {
  if (Math.random() < 0.4) return t.prevText;
  return t.toLang === 'ja' ? `「${t.prevText}」みたいなこと` : `something like "${t.prevText}"`;
}
