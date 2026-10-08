import { describe, expect, it } from 'vitest';
import type { ResolveTimeline, Snapshot, Task } from '../shared/types';
import { Game, type Outbox } from './game';
import { chainMultiplier, teamSizes } from '../shared/teams';
import { damageFrom, mockJudge } from './judge';

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
  const game = new Game(out, { judge: mockJudge, devMode: true, timing: { ...FAST, ...timing } });
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
    game.submit(first, t1.chainId, 'hop one');

    const t2 = tasks.get(second)!;
    expect(t2.prevText).toBe('hop one');
    expect(t2.fromLang).toBe(t1.toLang);
    expect(t2.toLang).toBe(t1.fromLang);
    game.submit(second, t2.chainId, 'final');

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

  it('a solo player casts both hops', () => {
    const { game, tasks, last } = setup();
    game.join('a', 'A', 'shika');
    game.start('a');
    expect(last().chains[0].order).toEqual(['a', 'a']);
    game.submit('a', tasks.get('a')!.chainId, 'x');
    expect(tasks.get('a')!.hopIndex).toBe(1);
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
      expect(new Set(c.order)).toEqual(new Set(team.members));
      expect(c.order.length % 2).toBe(0);
      expect(c.element).toBe(team.element);
    }
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
    for (const pid of chain.order) game.submit(pid, tasks.get(pid)!.chainId, 'same');
    await expect.poll(() => resolves.length, { timeout: 5000 }).toBe(1);
    const spell = resolves[0].chain;
    expect(spell.multiplier).toBe(2);
    expect(spell.damage).toBe(Math.round(damageFrom(spell.judge).damage * 2));
  });
});

describe('boss death', () => {
  it('stays in battle at 0 HP while the death plays, then declares victory', async () => {
    const snaps: Snapshot[] = [];
    const tasks = new Map<string, Task | null>();
    const game = new Game(
      { snapshot: (s) => snaps.push(s), task: (id, t) => tasks.set(id, t), resolve: () => {}, bossAttack: () => {} },
      { judge: async () => ({ exact: 1, same_concept: 0, related: 0, lost: 0 }), timing: { ...FAST, bossDeathMs: 60 } },
    );
    game.join('a', 'A', 'obachan');
    game.start('a');
    game.submit('a', tasks.get('a')!.chainId, 'x');
    game.submit('a', tasks.get('a')!.chainId, 'x');
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
