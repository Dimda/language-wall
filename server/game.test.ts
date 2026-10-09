import { describe, expect, it } from 'vitest';
import type { ResolveTimeline, Snapshot, Task } from '../shared/types';
import { Game, type Outbox } from './game';
import { chainMultiplier, teamSizes } from '../shared/teams';
import { damageFrom, mockJudge } from './judge';

/** A valid (guard-passing) answer in the task's target language. */
const ans = (t: Task, en = 'test answer', ja = 'テスト') => (t.toLang === 'ja' ? ja : en);

const FAST = {
  hopMs: 5000,
  revealBaseMs: 1,
  revealPerHopMs: 1,
  judgeMs: 1,
  spellMs: 1,
  pauseMs: 1,
  bossMs: 1,
  intermissionMs: 1,
  bannerMs: 1,
  bossDeathMs: 1,
  botMinMs: 1,
  botMaxMs: 2,
};

function setup(timing: Partial<typeof FAST> = {}) {
  const tasks = new Map<string, Task | null>();
  const resolves: ResolveTimeline[] = [];
  const snaps: Snapshot[] = [];
  const out: Outbox = {
    snapshot: (s) => snaps.push(s),
    task: (id, t) => tasks.set(id, t),
    resolve: (t) => resolves.push(t),
    bossAttack: () => {},
  };
  const game = new Game(out, { judge: mockJudge, devMode: true, minPlayers: 1, timing: { ...FAST, ...timing } });
  const last = () => snaps[snaps.length - 1];
  return { game, tasks, resolves, last };
}

describe('rounds', () => {
  it('pairs two players into one 2-hop chain that alternates languages and ends in the source language', async () => {
    const { game, tasks, resolves, last } = setup();
    game.join('a', 'Aiko', 'obachan');
    game.join('b', 'Sam', 'gaijin');
    game.start('a');

    const chain = last().chains[0];
    expect(last().chains).toHaveLength(1);
    expect(new Set(chain.order)).toEqual(new Set(['a', 'b']));

    const first = chain.order[0];
    const second = chain.order[1];
    const t1 = tasks.get(first)!;
    expect(tasks.get(second)).toBeUndefined();
    game.submit(first, t1.chainId, ans(t1, 'hop one', 'ホップ'));

    const t2 = tasks.get(second)!;
    expect(t2.prevText).toBe(ans(t1, 'hop one', 'ホップ'));
    expect(t2.fromLang).toBe(t1.toLang);
    expect(t2.toLang).toBe(t1.fromLang);
    game.submit(second, t2.chainId, ans(t2, 'final', 'さいご'));

    expect(last().turn).toBe('resolving');
    await expect.poll(() => resolves.length).toBe(1);
    const spell = resolves[0].chain;
    expect(spell.hops[1].toLang).toBe(spell.term.lang);
    expect(spell.casters.sort()).toEqual(['a', 'b']);
    await expect.poll(() => last().round).toBe(2);
  });

  it('fizzles the chain when the current caster disconnects', async () => {
    const { game, tasks, resolves, last } = setup();
    game.join('a', 'A', 'ninja');
    game.join('b', 'B', 'torafan');
    game.start('a');
    const caster = last().chains[0].order[0];
    expect(tasks.get(caster)).toBeTruthy();
    game.disconnect(caster);
    expect(last().chains[0].status).toBe('fizzled');
    await expect.poll(() => resolves.length).toBe(1);
    expect(resolves[0].chain.tier).toBe('fizzle');
  });

  it('fizzles on hop timeout', async () => {
    const { game, last } = setup({ hopMs: 20 });
    game.join('a', 'A', 'maiko');
    game.start('a');
    await expect.poll(() => last().chains[0]?.status ?? last().turn).not.toBe('casting');
  });

  it('a solo player translates once', () => {
    const { game, tasks, last } = setup();
    game.join('a', 'A', 'shika');
    game.start('a');
    expect(last().chains[0].order).toEqual(['a']);
    game.submit('a', tasks.get('a')!.chainId, ans(tasks.get('a')!));
    expect(last().chains[0].status).toBe('done');
  });
});

describe('teams', () => {
  it('splits into the fewest teams of at most 5, as evenly as possible', () => {
    expect(teamSizes(1)).toEqual([1]);
    expect(teamSizes(5)).toEqual([5]);
    expect(teamSizes(6)).toEqual([3, 3]);
    expect(teamSizes(11)).toEqual([4, 4, 3]);
    expect(teamSizes(21)).toEqual([5, 4, 4, 4, 4]);
    for (let n = 1; n <= 60; n++) {
      const sizes = teamSizes(n);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n);
      expect(Math.max(...sizes)).toBeLessThanOrEqual(5);
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    }
  });

  it('each team casts one chain with every connected member', () => {
    const { game, last } = setup();
    for (let i = 0; i < 7; i++) game.join(`p${i}`, `P${i}`, 'obachan');
    game.start('p0');
    const { teams, chains } = last();
    expect(teams.map((t) => t.members.length).sort()).toEqual([3, 4]);
    expect(chains).toHaveLength(2);
    for (const c of chains) {
      const team = teams.find((t) => t.id === c.teamId)!;
      expect([...c.order].sort()).toEqual([...team.members].sort());
      expect(c.element).toBe(team.element);
    }
  });

  it('caps the party at 30 players', () => {
    const { game, last } = setup();
    for (let i = 0; i < 35; i++) game.join(`p${i}`, `P${i}`, 'obachan');
    expect(last().players).toHaveLength(30);
    game.addBot();
    expect(last().players).toHaveLength(30);
    game.join('p0', 'Renamed', 'gaijin'); // existing players can still update themselves
    expect(last().players.find((p) => p.id === 'p0')?.name).toBe('Renamed');
  });

  it('late joiners go to the smallest team', () => {
    const { game, last } = setup();
    for (let i = 0; i < 7; i++) game.join(`p${i}`, `P${i}`, 'obachan');
    game.start('p0');
    game.join('late', 'Late', 'gaijin');
    const team = last().teams.find((t) => t.members.includes('late'))!;
    expect(team.members).toHaveLength(4);
  });

  it('longer chains multiply damage', async () => {
    expect(chainMultiplier(2)).toBe(1);
    expect(chainMultiplier(4)).toBe(2);
    expect(chainMultiplier(6)).toBe(3);
    const { game, tasks, resolves, last } = setup();
    for (let i = 0; i < 4; i++) game.join(`p${i}`, `P${i}`, 'obachan');
    game.start('p0');
    const chain = last().chains[0];
    for (const pid of chain.order) game.submit(pid, tasks.get(pid)!.chainId, ans(tasks.get(pid)!));
    await expect.poll(() => resolves.length, { timeout: 5000 }).toBe(1);
    const spell = resolves[0].chain;
    expect(spell.multiplier).toBe(2);
    expect(spell.damage).toBe(Math.round(damageFrom(spell.judge).damage * 2));
  });
});

describe('answer guard in game', () => {
  it('refuses a human answer that reuses the word, and keeps the hop open', () => {
    const rejections: string[] = [];
    const tasks = new Map<string, Task | null>();
    const game = new Game(
      { snapshot: () => {}, task: (id, t) => tasks.set(id, t), resolve: () => {}, bossAttack: () => {}, rejected: (_id, r) => rejections.push(r.en) },
      { judge: mockJudge, minPlayers: 1, timing: FAST },
    );
    game.join('a', 'A', 'obachan');
    game.join('b', 'B', 'gaijin');
    game.start('a');
    const [first] = ['a', 'b'].filter((id) => tasks.get(id));
    const task = tasks.get(first)!;
    game.submit(first, task.chainId, task.prevText); // just passing the word along
    expect(rejections).toHaveLength(1);
    expect(tasks.get(first)?.hopIndex).toBe(0); // still their turn
  });
});

describe('session controls', () => {
  const make = () => {
    const snaps: Snapshot[] = [];
    const game = new Game({ snapshot: (s) => snaps.push(s), task: () => {}, resolve: () => {}, bossAttack: () => {} }, { judge: mockJudge, devMode: true, timing: FAST });
    return { game, last: () => snaps[snaps.length - 1] };
  };

  it('needs at least 3 players to start (bots count)', () => {
    const { game, last } = make();
    game.join('h', 'Host', 'obachan');
    game.addBot();
    game.start('h');
    expect(last().phase).toBe('lobby');
    expect(last().log.at(-1)?.text).toContain('at least 3');
    game.addBot();
    game.start('h');
    expect(last().phase).toBe('battle');
  });

  it('only the host can finalize, and it returns everyone to the lobby', () => {
    const { game, last } = make();
    game.join('h', 'Host', 'obachan');
    game.join('p', 'Player', 'gaijin');
    game.addBot();
    game.start('h');
    game.finalize('p');
    expect(last().phase).toBe('battle');
    game.finalize('h');
    expect(last().phase).toBe('lobby');
    expect(last().players).toHaveLength(3);
    expect(last().log.at(-1)?.text).toContain('ended the game');
  });

  it('the host can remove bots in the lobby', () => {
    const { game, last } = make();
    game.join('h', 'Host', 'obachan');
    game.join('p', 'Player', 'gaijin');
    game.addBot();
    game.addBot();
    const [firstBot] = last().players.filter((p) => p.isBot);
    game.removeBot('p'); // not the host
    expect(last().players.filter((p) => p.isBot)).toHaveLength(2);
    game.removeBot('h', firstBot.id);
    expect(last().players.some((p) => p.id === firstBot.id)).toBe(false);
    game.removeBot('h'); // newest
    expect(last().players.filter((p) => p.isBot)).toHaveLength(0);
  });
});

describe('boss death', () => {
  it('stays in battle at 0 HP while the death plays, then declares victory', async () => {
    const snaps: Snapshot[] = [];
    const tasks = new Map<string, Task | null>();
    const game = new Game(
      { snapshot: (s) => snaps.push(s), task: (id, t) => tasks.set(id, t), resolve: () => {}, bossAttack: () => {} },
      { judge: async () => ({ exact: 1, same_concept: 0, related: 0, lost: 0 }), minPlayers: 1, timing: { ...FAST, bossDeathMs: 60 } },
    );
    game.join('a', 'A', 'obachan');
    game.start('a');
    game.submit('a', tasks.get('a')!.chainId, ans(tasks.get('a')!));
    await expect.poll(() => snaps.some((s) => s.phase === 'battle' && s.boss.hp === 0), { timeout: 5000 }).toBe(true);
    expect(snaps[snaps.length - 1].phase).toBe('battle');
    await expect.poll(() => snaps[snaps.length - 1].phase, { timeout: 5000 }).toBe('victory');
  });
});

describe('judge', () => {
  it('returns exact for normalized-equal strings → perfect', async () => {
    const r = await mockJudge('Ship it!', 'ship  it', 'en');
    expect(r.exact).toBe(1);
    expect(damageFrom(r)).toEqual({ damage: 150, tier: 'perfect' });
  });

  it('returns probabilities summing to 1 otherwise', async () => {
    const r = await mockJudge('炎上', 'まったく違う', 'ja');
    expect(r.exact + r.same_concept + r.related + r.lost).toBeCloseTo(1);
    expect(damageFrom(r).tier).not.toBe('perfect');
  });
});
