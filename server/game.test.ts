import { describe, expect, it } from 'vitest';
import type { ResolveTimeline, Snapshot, Task } from '../shared/types';
import { Game, type Outbox } from './game';
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
    game.join('a', 'Aiko', 'samurai');
    game.join('b', 'Sam', 'mage');
    game.start('a', 2);

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
    game.join('b', 'B', 'robot');
    game.start('a', 2);
    const caster = last().chains[0].order[0];
    expect(tasks.get(caster)).toBeTruthy();
    game.disconnect(caster);
    expect(last().chains[0].status).toBe('fizzled');
    await expect.poll(() => resolves.length).toBe(1);
    expect(resolves[0].chain.tier).toBe('fizzle');
  });

  it('fizzles on hop timeout', async () => {
    const { game, last } = setup({ hopMs: 20 });
    game.join('a', 'A', 'miko');
    game.start('a', 2);
    await expect.poll(() => last().chains[0]?.status ?? last().turn).not.toBe('casting');
  });

  it('a solo player casts both hops', () => {
    const { game, tasks, last } = setup();
    game.join('a', 'A', 'kitsune');
    game.start('a', 2);
    expect(last().chains[0].order).toEqual(['a', 'a']);
    game.submit('a', tasks.get('a')!.chainId, 'x');
    expect(tasks.get('a')!.hopIndex).toBe(1);
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
