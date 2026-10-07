import { useEffect, useMemo, useRef, useState } from 'react';
import { type Element, IMPACT_MS, type PlayerPublic, type Snapshot, type Tier } from '../../shared/types';
import { audio } from '../audio';
import { BattleLog } from '../components/BattleLog';
import { Boss } from '../components/Boss';
import { Fighter, type FighterRole } from '../components/Fighter';
import { KansaiBackdrop } from '../components/KansaiBackdrop';
import { ResolveWindow, stageAt, TIER_LABEL } from '../components/ResolveWindow';
import { ELEMENT_COLOR, ELEMENT_LABEL } from '../components/sprites';
import { TaskPanel } from '../components/TaskPanel';
import { HpBar } from '../components/ui';
import { isScreen, useGame } from '../net';
import { SpellFX } from '../spellfx';

interface Float {
  id: number;
  text: string;
  tier: Tier;
}

let floatSeq = 0;

/** Each player's role this round, derived from the public chain state. */
function rolesFrom(snapshot: Snapshot): Map<string, { role: FighterRole; element: Element }> {
  const roles = new Map<string, { role: FighterRole; element: Element }>();
  for (const c of snapshot.chains) {
    c.order.forEach((pid, i) => {
      let role: FighterRole;
      if (c.status === 'fizzled') role = 'fizzled';
      else if (c.status === 'done' || i < c.hopIndex) role = 'done';
      else if (i === c.hopIndex) role = snapshot.players.find((p) => p.id === pid)?.typing ? 'typing' : 'casting';
      else role = 'waiting';
      const prev = roles.get(pid);
      // A player who appears twice: the active hop wins.
      if (!prev || role === 'casting' || role === 'typing' || (prev.role === 'done' && role === 'waiting')) {
        roles.set(pid, { role, element: c.element });
      }
    });
  }
  return roles;
}

export function Battle({ snapshot, me }: { snapshot: Snapshot; me: PlayerPublic | null }) {
  const { task, resolving, bossAttack } = useGame();
  const { boss, party, turn, round } = snapshot;
  const bossPct = boss.maxHp ? (boss.hp / boss.maxHp) * 100 : 0;

  const stageRef = useRef<HTMLDivElement>(null);
  const bossRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const fx = useRef<SpellFX | null>(null);

  const [elapsed, setElapsed] = useState(0);
  const [floats, setFloats] = useState<Float[]>([]);
  const [bossHit, setBossHit] = useState(0);
  const [tierBanner, setTierBanner] = useState<{ id: number; tier: Tier } | null>(null);
  const [banner, setBanner] = useState<{ id: number; text: string; sub?: string } | null>(null);

  const players = snapshot.players.filter((p) => p.connected);
  const roles = useMemo(() => rolesFrom(snapshot), [snapshot]);
  const spriteSize = players.length > 10 ? 40 : players.length > 6 ? 52 : players.length > 3 ? 64 : 80;

  // ── canvas FX lifecycle ──
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new SpellFX(canvasRef.current);
    fx.current = engine;
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      engine.destroy();
      fx.current = null;
    };
  }, []);

  const centerOf = (el: { getBoundingClientRect(): DOMRect } | null) => {
    const stage = stageRef.current?.getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    if (!stage || !r) return null;
    return { x: r.left - stage.left + r.width / 2, y: r.top - stage.top + r.height / 2 };
  };

  const shake = (strength: number, ms: number) => {
    innerRef.current?.animate(
      [0, -strength, strength, -strength / 2, strength / 2, 0].map((x, i) => ({
        transform: `translate(${x}px, ${i % 2 ? strength / 3 : 0}px)`,
      })),
      { duration: ms, easing: 'steps(6)' },
    );
  };

  // ── turn banners ──
  useEffect(() => {
    if (turn === 'casting') setBanner({ id: Date.now(), text: `ROUND ${round}`, sub: 'Cast your spells! / 詠唱開始!' });
    else if (turn === 'resolving') setBanner({ id: Date.now(), text: 'SPELLS UNLEASHED', sub: '魔法発動!' });
  }, [turn, round]);

  // ── sparkles above typing casters ──
  useEffect(() => {
    if (turn !== 'casting') return;
    const t = setInterval(() => {
      for (const p of snapshot.players) {
        const r = roles.get(p.id);
        if (r?.role !== 'typing') continue;
        const el = stageRef.current?.querySelector(`[data-pid="${CSS.escape(p.id)}"] .fighter-sprite`);
        const at = centerOf(el ?? null);
        if (at) fx.current?.sparkle(at, ELEMENT_COLOR[r.element]);
      }
    }, 120);
    return () => clearInterval(t);
  }, [turn, roles, snapshot.players]);

  // ── resolution playback ──
  useEffect(() => {
    if (!resolving) return;
    const { timeline, receivedAt } = resolving;
    const { chain } = timeline;
    const spellAt = timeline.revealMs + timeline.judgeMs;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const after = (ms: number, fn: () => void) =>
      timers.push(setTimeout(fn, Math.max(0, ms - (performance.now() - receivedAt))));

    const tick = setInterval(() => setElapsed(performance.now() - receivedAt), 50);
    const lineMs = timeline.revealMs / (chain.hops.length + 1);
    for (let i = 0; i <= chain.hops.length; i++) after(i * lineMs, () => audio.sfx('blip'));
    after(timeline.revealMs, () => audio.sfx('judge'));
    after(spellAt, () => {
      audio.sfx(chain.tier === 'fizzle' ? 'fizzle' : 'charge');
      const stage = stageRef.current;
      const casters = chain.casters
        .map((id) => centerOf(stage?.querySelector(`[data-pid="${CSS.escape(id)}"] .fighter-sprite`) ?? null))
        .filter((p): p is { x: number; y: number } => !!p);
      const target = centerOf(bossRef.current);
      if (target) fx.current?.cast(casters, target, chain.element, chain.tier);
    });
    after(spellAt + IMPACT_MS, () => {
      setTierBanner({ id: ++floatSeq, tier: chain.tier });
      if (chain.tier === 'fizzle') return;
      audio.sfx(chain.tier === 'perfect' ? 'crit' : 'hit');
      setBossHit(floatSeq);
      shake(chain.tier === 'perfect' ? 16 : chain.tier === 'strong' ? 8 : 3, chain.tier === 'perfect' ? 600 : 300);
      const f = { id: ++floatSeq, text: String(chain.damage), tier: chain.tier };
      setFloats((fs) => [...fs, f]);
      after(spellAt + IMPACT_MS + 1500, () => setFloats((fs) => fs.filter((x) => x.id !== f.id)));
    });
    return () => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
    };
  }, [resolving]);

  // ── boss attack ──
  const [hurtKey, setHurtKey] = useState(0);
  useEffect(() => {
    if (!bossAttack) return;
    audio.sfx('boss');
    setBanner({ id: Date.now(), text: 'ENEMY TURN', sub: `言葉の壁の攻撃! −${bossAttack.damage} HP` });
    shake(12, 500);
    setHurtKey(bossAttack.id);
  }, [bossAttack?.id]);

  const spellStage = resolving ? stageAt(resolving.timeline, elapsed) : null;
  const channeling = resolving && (spellStage === 'judge' || spellStage === 'spell') ? new Set(resolving.timeline.chain.casters) : null;

  const myRole = me ? roles.get(me.id) : undefined;
  const status =
    turn === 'resolving'
      ? 'Watch the spells! / 魔法発動中…'
      : turn === 'boss'
        ? 'The wall strikes back! / 敵のターン'
        : turn === 'intermission'
          ? 'Next round incoming… / 次のラウンドへ'
          : !myRole
            ? 'You join next round! / 次のラウンドから参加'
            : myRole.role === 'waiting'
              ? 'Your turn is coming — watch the glow! / もうすぐあなたの番'
              : 'Your part is cast! Waiting for the others… / 詠唱完了';

  return (
    <div className={`screen battle ${isScreen ? 'projector' : ''}`}>
      <div ref={innerRef} className="battle-inner">
        <div className="battle-top">
          <HpBar label="言葉の壁 / THE LANGUAGE WALL" hp={boss.hp} max={boss.maxHp} variant="boss" />
          <span className="round-tag">ROUND {round}</span>
        </div>

        <div ref={stageRef} className="stage">
          <KansaiBackdrop />
          <div ref={bossRef} className="boss-area">
            <Boss hpPct={bossPct} hitKey={bossHit} />
            {floats.map((f) => (
              <span key={f.id} className={`dmg-float tier-${f.tier}`}>
                {f.tier === 'perfect' && <small>CRITICAL!</small>}
                {f.text}
              </span>
            ))}
          </div>

          <div className="party-area">
            {players.map((p) => {
              const r = roles.get(p.id);
              const role: FighterRole = channeling?.has(p.id) ? 'channel' : turn === 'casting' ? (r?.role ?? 'idle') : 'idle';
              const element = channeling?.has(p.id) ? resolving!.timeline.chain.element : (r?.element ?? null);
              return (
                <Fighter
                  key={p.id}
                  player={p}
                  role={role}
                  element={element}
                  size={spriteSize}
                  isMe={p.id === me?.id}
                  hurtKey={hurtKey}
                />
              );
            })}
          </div>

          <canvas ref={canvasRef} className="fx" />

          {resolving && <ResolveWindow timeline={resolving.timeline} elapsed={elapsed} />}

          {tierBanner && (
            <div key={tierBanner.id} className={`tier-banner tier-${tierBanner.tier}`}>
              <b>{TIER_LABEL[tierBanner.tier].ja}</b>
              <small>{TIER_LABEL[tierBanner.tier].en}</small>
            </div>
          )}

          {banner && (
            <div key={banner.id} className="turn-banner">
              <b>{banner.text}</b>
              {banner.sub && <small>{banner.sub}</small>}
            </div>
          )}
        </div>

        <HpBar label="PARTY" hp={party.hp} max={party.maxHp} variant="party" />

        <div className="bottom">
          {isScreen ? <CastStatus snapshot={snapshot} /> : <TaskPanel task={task} status={status} />}
          <BattleLog log={snapshot.log} />
        </div>
      </div>
      {bossAttack && <div key={bossAttack.id} className="flash" />}
    </div>
  );
}

/** Projector view: who is casting what right now. */
function CastStatus({ snapshot }: { snapshot: Snapshot }) {
  const name = (id: string) => snapshot.players.find((p) => p.id === id)?.name ?? '?';
  return (
    <div className="window cast-status">
      {snapshot.chains.map((c) => {
        const el = ELEMENT_LABEL[c.element];
        return (
          <div key={c.id} className={`cast-row status-${c.status}`} style={{ '--el': ELEMENT_COLOR[c.element] } as React.CSSProperties}>
            <span className="el-name">
              {el.icon} {el.en}
            </span>
            <span className="cast-order">
              {c.order.map((pid, i) => (
                <span key={i} className={i < c.hopIndex ? 'past' : i === c.hopIndex && c.status === 'casting' ? 'now' : ''}>
                  {i > 0 && ' → '}
                  {name(pid)}
                </span>
              ))}
            </span>
            <span>{c.status === 'done' ? '✦ READY' : c.status === 'fizzled' ? '✕ FIZZLED' : '✎'}</span>
          </div>
        );
      })}
    </div>
  );
}
