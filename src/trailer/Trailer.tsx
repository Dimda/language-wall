import QRCode from 'qrcode';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type AvatarId, type Element, IMPACT_MS, type PlayerPublic, type Ruby, type Tier } from '../../shared/types';
import { audio } from '../audio';
import { Boss } from '../components/Boss';
import { Fighter } from '../components/Fighter';
import { KansaiBackdrop } from '../components/KansaiBackdrop';
import { TIER_LABEL } from '../components/ResolveWindow';
import { AVATARS, ELEMENT_COLOR, Sprite } from '../components/sprites';
import { HpBar, RubyText, Typewriter } from '../components/ui';
import { SpellFX } from '../spellfx';
import './trailer.css';

/**
 * Cinematic ~80s trailer that explains the game, built from the game's own art, music and effects.
 * Renders a fixed 1280×720 frame scaled to the window. Open with `?trailer` (`&autoplay` focuses play).
 */

const FRAME_W = 1280;
const FRAME_H = 720;
const PLAY_URL = new URLSearchParams(location.search).get('url') ?? 'language-wall.onrender.com';

// ── timeline (ms) ──────────────────────────────────────
const INTRO = 0;
const SKY = 5000;
const BOSS = 9200;
const HEROES = 15000;
const TEAMS = 21000; // STEP 1
const CHAIN = 27000; // STEP 2
const JUDGE = 41000; // STEP 3
const FIGHT = 49000; // STEP 4
const STEP_CARD_MS = 1900;

const CASTS: { at: number; element: Element; tier: Tier; hp: number; casters: number[] }[] = [
  { at: FIGHT + 2300, element: 'fire', tier: 'strong', hp: 80, casters: [0, 1] },
  { at: FIGHT + 5100, element: 'thunder', tier: 'strong', hp: 58, casters: [2, 3] },
  { at: FIGHT + 7900, element: 'ice', tier: 'perfect', hp: 24, casters: [0, 2, 3] },
  { at: FIGHT + 13600, element: 'light', tier: 'perfect', hp: 0, casters: [0, 1, 2, 3] },
];
const ENEMY_TURN = FIGHT + 10700;
const KILL = CASTS[CASTS.length - 1].at + IMPACT_MS;
const FINALE = KILL + 5200;
const END = FINALE + 11500;
const BOSS_MAX = 1500;

// ── the example chain shown in STEP 2 / STEP 3 ─────────
const TERM = '一期一会';
const TERM_RUBY: Ruby = [['一期一会', 'いちごいちえ']];
const HOPS: { who: string; avatar: AvatarId; to: 'EN' | 'JA'; text: string; ruby?: Ruby }[] = [
  { who: 'Aiko', avatar: 'obachan', to: 'EN', text: 'a once-in-a-lifetime meeting' },
  {
    who: 'Sam',
    avatar: 'gaijin',
    to: 'JA',
    text: '一生に一度の出会い',
    ruby: [['一生', 'いっしょう'], 'に', ['一度', 'いちど'], 'の', ['出会', 'であ'], 'い'],
  },
  { who: 'Keiko', avatar: 'maiko', to: 'EN', text: 'meeting someone only once in your life' },
];
const HOP_AT = [CHAIN + 4600, CHAIN + 7300, CHAIN + 10000]; // text appears; typing starts 1.1s before
const VERDICT = { exact: 0.58, same_concept: 0.38, related: 0.04, lost: 0, confidence: 88 };

const FIGHTERS: { id: string; name: string; avatar: AvatarId }[] = [
  { id: 'f0', name: 'Aiko', avatar: 'obachan' },
  { id: 'f1', name: 'Sam', avatar: 'gaijin' },
  { id: 'f2', name: 'Keiko', avatar: 'maiko' },
  { id: 'f3', name: 'Dev', avatar: 'eikaiwa' },
];

const fakePlayer = (f: (typeof FIGHTERS)[number]): PlayerPublic => ({
  id: f.id,
  name: f.name,
  avatar: f.avatar,
  connected: true,
  isHost: false,
  isBot: false,
  typing: false,
});

function useFrameScale() {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / FRAME_W, window.innerHeight / FRAME_H));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return scale;
}

/** Milliseconds since the current run started; restarts whenever `run` changes. */
function useClock(run: number) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!run) return;
    setT(0);
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      setT(performance.now() - start);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run]);
  return t;
}

const between = (t: number, a: number, b: number) => t >= a && t < b;

export function Trailer() {
  const autoplay = new URLSearchParams(location.search).has('autoplay');
  const [run, setRun] = useState(0);
  const t = useClock(run);
  const scale = useFrameScale();

  return (
    <div className="trailer-root">
      <div className="trailer-frame" style={{ transform: `scale(${scale})` }}>
        {run > 0 ? (
          <TrailerScenes key={run} t={t} onReplay={() => setRun((r) => r + 1)} />
        ) : (
          <button
            type="button"
            className="tr-start"
            autoFocus={autoplay}
            onClick={() => {
              audio.unlock();
              setRun(1);
            }}
          >
            ▶ PLAY TRAILER
            <small>♪ sound on</small>
          </button>
        )}
      </div>
    </div>
  );
}

/** Big "STEP n" title card that slams in, then shrinks into a header for the rest of the scene. */
function StepCard({ t, start, n, ja, en }: { t: number; start: number; n: number; ja: string; en: string }) {
  const big = t - start < STEP_CARD_MS;
  return (
    <div className={`tr-step ${big ? 'big' : 'small'}`} key={big ? 'big' : 'small'}>
      <span className="tr-step-n">STEP {n}</span>
      <b>{ja}</b>
      <small>{en}</small>
    </div>
  );
}

function TrailerScenes({ t, onReplay }: { t: number; onReplay: () => void }) {
  const [bossHp, setBossHp] = useState(100);
  const [partyHp, setPartyHp] = useState(100);
  const [hitKey, setHitKey] = useState(0);
  const [hurtKey, setHurtKey] = useState(0);
  const [floats, setFloats] = useState<{ id: number; amount: number; tier: Tier }[]>([]);
  const [tier, setTier] = useState<{ id: number; tier: Tier } | null>(null);
  const [channel, setChannel] = useState<{ ids: number[]; element: Element } | null>(null);
  const [banner, setBanner] = useState<{ id: number; text: string; sub: string } | null>(null);
  const [flash, setFlash] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const bossRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fx = useRef<SpellFX | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Scripted events: music, sound effects, spell casts, boss and party damage.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const shake = (strength: number, ms: number) =>
      frameRef.current?.animate(
        [0, -strength, strength, -strength / 2, strength / 2, 0].map((x, i) => ({
          transform: `translate(${x}px, ${i % 2 ? strength / 3 : 0}px)`,
        })),
        { duration: ms, easing: 'steps(6)' },
      );
    const center = (el: { getBoundingClientRect(): DOMRect } | null | undefined) => {
      const stage = stageRef.current?.getBoundingClientRect();
      const r = el?.getBoundingClientRect();
      return stage && r ? { x: r.left - stage.left + r.width / 2, y: r.top - stage.top + r.height / 2 } : null;
    };

    // intro + reveal
    audio.play('quiet');
    at(INTRO + 300, () => audio.sfx('blip'));
    at(BOSS + 500, () => {
      audio.sfx('boss');
      shake(10, 700);
    });
    at(BOSS + 1700, () => {
      audio.play('battle');
      audio.sfx('crit');
      shake(18, 500);
    });
    for (let i = 0; i < AVATARS.length; i++) at(HEROES + 900 + i * 260, () => audio.sfx('select'));

    // step cards
    for (const s of [TEAMS, CHAIN, JUDGE, FIGHT]) {
      at(s + 50, () => {
        audio.sfx('crit');
        shake(8, 300);
      });
    }

    // STEP 1: teams form
    at(TEAMS + 4000, () => audio.sfx('submit'));

    // STEP 2: the chain
    at(CHAIN + 2300, () => audio.sfx('blip'));
    HOP_AT.forEach((ms) => {
      at(ms - 1100, () => audio.sfx('select'));
      at(ms, () => audio.sfx('submit'));
    });
    at(CHAIN + 11800, () => audio.sfx('fizzle'));
    at(CHAIN + 12500, () => audio.sfx('select'));

    // STEP 3: Jev judges
    at(JUDGE, () => audio.play('quiet'));
    at(JUDGE + 2200, () => audio.sfx('judge'));
    at(JUDGE + 4300, () => {
      audio.sfx('crit');
      shake(10, 400);
    });

    // STEP 4: spells, enemy turn, final blow
    at(FIGHT, () => audio.play('battle'));
    CASTS.forEach((c, i) => {
      at(c.at, () => {
        setChannel({ ids: c.casters, element: c.element });
        audio.sfx('charge');
        if (!fx.current && canvasRef.current) fx.current = new SpellFX(canvasRef.current);
        const casters = c.casters
          .map((idx) => center(stageRef.current?.querySelector(`[data-pid="f${idx}"] .fighter-sprite`)))
          .filter((p): p is { x: number; y: number } => !!p);
        const target = center(bossRef.current);
        if (target) fx.current?.cast(casters, target, c.element, c.tier);
      });
      at(c.at + IMPACT_MS, () => {
        setChannel(null);
        setHitKey((k) => k + 1);
        setBossHp(c.hp);
        setTier({ id: i + 1, tier: c.tier });
        const prev = i === 0 ? 100 : CASTS[i - 1].hp;
        setFloats((f) => [...f, { id: i + 1, amount: Math.round(((prev - c.hp) / 100) * BOSS_MAX), tier: c.tier }]);
        audio.sfx(c.tier === 'perfect' ? 'crit' : 'hit');
        shake(c.tier === 'perfect' ? 18 : 8, c.tier === 'perfect' ? 600 : 300);
      });
    });
    at(ENEMY_TURN, () => {
      audio.sfx('boss');
      shake(16, 600);
      setFlash((f) => f + 1);
      setHurtKey((k) => k + 1);
      setPartyHp(62);
      setBanner({ id: 1, text: 'ENEMY TURN / 敵のターン', sub: 'Fizzled spells make it hit harder — 不発が多いほど強烈に' });
    });
    at(KILL, () => {
      audio.play(null);
      audio.sfx('crumble');
      shake(6, 1200);
    });
    at(KILL + 1200, () => {
      shake(24, 900);
      setBanner({ id: 2, text: '言葉の壁が崩れた!', sub: 'THE WALL CRUMBLES!' });
    });
    at(FINALE, () => audio.play('victory'));
    at(FINALE + 4200, () => audio.play('menu'));
    at(END, () => audio.play(null));

    return () => {
      timers.forEach(clearTimeout);
      fx.current?.destroy();
      fx.current = null;
    };
  }, []);

  const typingHop = HOP_AT.findIndex((ms) => t >= ms - 1100 && t < ms);
  const fighting = t >= FIGHT && t < FINALE;

  return (
    <div ref={frameRef} className="tr-frame-inner">
      {/* 0. cold open */}
      <section className={`tr-scene tr-intro ${between(t, INTRO, SKY + 600) ? 'show' : ''}`}>
        {t >= 400 && (
          <p className="tr-line big">
            <Typewriter text="関西。" ms={120} />
          </p>
        )}
        {t >= 1500 && (
          <p className="tr-line">
            <Typewriter text="Japanese speakers. English speakers." ms={40} />
          </p>
        )}
        {t >= 3100 && (
          <p className="tr-line">
            <Typewriter text="Same feelings. Different words." ms={40} />
          </p>
        )}
      </section>

      {/* 1–2. skyline, boss reveal, heroes */}
      <section className={`tr-scene tr-stage-scene ${between(t, SKY, TEAMS + 400) ? 'show' : ''}`}>
        <div className="tr-stage">
          <KansaiBackdrop />
          {t >= BOSS && t < TEAMS + 400 && (
            <div className="tr-boss-rise">
              <Boss hpPct={100} hitKey={0} />
            </div>
          )}
        </div>
        {between(t, SKY + 800, BOSS + 300) && <p className="tr-caption">But between them stands…</p>}
        {t >= BOSS + 1700 && t < HEROES && (
          <div className="tr-title">
            <b>言葉の壁</b>
            <small>THE LANGUAGE WALL</small>
          </div>
        )}
        {t >= HEROES && t < TEAMS + 400 && (
          <div className="tr-heroes">
            <p className="tr-caption top">Up to 30 heroes · 12 Kansai fighters · 最大30人で挑め</p>
            <div className="tr-hero-grid">
              {AVATARS.map((a, i) =>
                t >= HEROES + 900 + i * 260 ? (
                  <div key={a.id} className="tr-hero">
                    <Sprite avatar={a.id} size={92} walk />
                    <span>{a.labelJa}</span>
                    <small>{a.label}</small>
                  </div>
                ) : (
                  <div key={a.id} className="tr-hero placeholder" />
                ),
              )}
            </div>
          </div>
        )}
      </section>

      {/* STEP 1: team up */}
      <section className={`tr-scene tr-explain ${between(t, TEAMS, CHAIN + 300) ? 'show' : ''}`}>
        {t >= TEAMS && t < CHAIN + 300 && (
          <>
            <StepCard t={t} start={TEAMS} n={1} ja="チームを組む" en="TEAM UP" />
            {t >= TEAMS + STEP_CARD_MS && (
              <div className="tr-teams">
                <div className={`tr-crowd ${t >= TEAMS + 3800 ? 'gone' : ''}`}>
                  {Array.from({ length: 13 }, (_, i) => (
                    <Sprite key={i} avatar={AVATARS[i % AVATARS.length].id} size={64} walk />
                  ))}
                  <p>13 players join · 13人が参加</p>
                </div>
                {t >= TEAMS + 3800 && (
                  <div className="tr-team-boxes">
                    {[
                      { name: 'たこ焼き隊', el: 'fire' as Element, n: 5, from: 0 },
                      { name: '通天閣団', el: 'ice' as Element, n: 4, from: 5 },
                      { name: '鹿せんべい組', el: 'thunder' as Element, n: 4, from: 9 },
                    ].map((team, ti) => (
                      <div
                        key={team.name}
                        className="tr-team-box"
                        style={{ '--el': ELEMENT_COLOR[team.el], animationDelay: `${ti * 0.18}s` } as React.CSSProperties}
                      >
                        <span>{team.name}</span>
                        <div>
                          {Array.from({ length: team.n }, (_, k) => (
                            <Sprite key={k} avatar={AVATARS[(team.from + k) % AVATARS.length].id} size={64} walk />
                          ))}
                        </div>
                        <small>{team.n} heroes</small>
                      </div>
                    ))}
                  </div>
                )}
                {t >= TEAMS + 4400 && (
                  <p className="tr-explain-text">
                    最大5人のチームに自動で均等に分かれる
                    <small>Auto-balanced teams of up to 5 — 13 players → 5 · 4 · 4</small>
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* STEP 2: pass the word */}
      <section className={`tr-scene tr-explain ${between(t, CHAIN, JUDGE + 300) ? 'show' : ''}`}>
        {t >= CHAIN && t < JUDGE + 300 && (
          <>
            <StepCard t={t} start={CHAIN} n={2} ja="言葉をつなぐ" en="PASS THE WORD" />
            {t >= CHAIN + STEP_CARD_MS && (
              <div className="tr-chain">
                <div className="tr-chain-start">
                  <span className="tr-tag ja">お題 · JA</span>
                  <b>
                    「<RubyText ruby={TERM_RUBY} />」
                  </b>
                  <small>random word — Japanese or English · 日本語か英語がランダムに出題</small>
                </div>
                <div className="tr-chain-track">
                  {HOPS.map((h, i) => {
                    const shown = t >= HOP_AT[i];
                    const typing = typingHop === i;
                    if (!shown && !typing) return <div key={i} className="tr-node placeholder" />;
                    return (
                      <div key={i} className={`tr-node ${shown ? 'done' : 'typing'}`}>
                        <div className={`tr-lang-pill to-${h.to.toLowerCase()}`}>→ {h.to === 'JA' ? '日本語' : 'ENGLISH'}</div>
                        <div className="tr-node-who">
                          <Sprite avatar={h.avatar} size={72} walk={!typing} />
                          {typing && <span className="bubble tr-bubble">✎…</span>}
                          <span>{h.who}</span>
                        </div>
                        <p className="tr-node-text">
                          {shown ? h.ruby ? <RubyText ruby={h.ruby} /> : <Typewriter text={h.text} ms={22} /> : '…'}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {t >= CHAIN + 11600 && (
                  <div className="tr-rules">
                    <span className="bad">✕ 同じ言葉はNG · No copying the word</span>
                    <span className="good">✓ もう一方の言語で書く · Write it in the other language</span>
                    <span className="good">✓ 漢字にはふりがな · Furigana over kanji</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* STEP 3: Jev judges */}
      <section className={`tr-scene tr-explain ${between(t, JUDGE, FIGHT + 300) ? 'show' : ''}`}>
        {t >= JUDGE && t < FIGHT + 300 && (
          <>
            <StepCard t={t} start={JUDGE} n={3} ja="Jev が判定" en="JEV JUDGES THE MEANING" />
            {t >= JUDGE + STEP_CARD_MS && (
              <div className="window tr-verdict">
                <p className="tr-compare">
                  「<RubyText ruby={TERM_RUBY} />」 <span>⇒</span> 「{HOPS[HOPS.length - 1].text}」
                </p>
                <div className="bars">
                  {(
                    [
                      ['完全一致 · EXACT', 'exact', VERDICT.exact],
                      ['同じ意味 · SAME IDEA', 'same_concept', VERDICT.same_concept],
                      ['関連 · RELATED', 'related', VERDICT.related],
                      ['失われた · LOST', 'lost', VERDICT.lost],
                    ] as const
                  ).map(([label, key, v]) => {
                    const k = Math.min(1, Math.max(0, (t - JUDGE - 2200) / 1600));
                    return (
                      <div key={key} className="bar-row">
                        <span>{label}</span>
                        <div className="bar-track">
                          <div className={`bar-fill ${key}`} style={{ width: `${v * 100 * k}%` }} />
                        </div>
                        <span>{Math.round(v * 100 * k)}%</span>
                      </div>
                    );
                  })}
                </div>
                {t >= JUDGE + 4300 && (
                  <div className="tr-verdict-line">
                    <b>判定: 完全一致 · EXACT</b>
                    <span>確信度 / confidence {VERDICT.confidence}%</span>
                    <span className="chain-bonus">3-HOP ×1.5 — longer chains hit harder</span>
                  </div>
                )}
                {t >= JUDGE + 5200 && (
                  <p className="tr-jev">
                    Judged by <b>TypeSafe Jev</b> — meaning, not word-for-word
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* STEP 4: cast together, enemy turn, final blow */}
      <section className={`tr-scene tr-stage-scene ${between(t, FIGHT, FINALE) ? 'show' : ''}`}>
        {fighting && (
          <div className="tr-stage" ref={stageRef}>
            <KansaiBackdrop />
            <div className="tr-fight">
              <div className="tr-fight-boss" ref={bossRef}>
                <Boss hpPct={bossHp} hitKey={hitKey} />
                {floats.map((f) => (
                  <span key={f.id} className={`dmg-float tier-${f.tier}`}>
                    {f.tier === 'perfect' && <small>CRITICAL!</small>}
                    {f.amount}
                  </span>
                ))}
              </div>
              <div className="tr-fight-party">
                {FIGHTERS.map((f, i) => (
                  <Fighter
                    key={f.id}
                    player={fakePlayer(f)}
                    role={channel?.ids.includes(i) ? 'channel' : 'idle'}
                    element={channel?.ids.includes(i) ? channel.element : null}
                    size={96}
                    isMe={false}
                    hurtKey={hurtKey}
                  />
                ))}
              </div>
            </div>
            <canvas ref={canvasRef} className="fx" />
            {tier && (
              <div key={tier.id} className={`tier-banner tier-${tier.tier}`}>
                <b>{TIER_LABEL[tier.tier].ja}</b>
                <small>{TIER_LABEL[tier.tier].en}</small>
              </div>
            )}
            {banner && (
              <div key={banner.id} className="turn-banner">
                <b>{banner.text}</b>
                <small>{banner.sub}</small>
              </div>
            )}
            <div className="tr-hp">
              <HpBar label="言葉の壁 / THE LANGUAGE WALL" hp={Math.round((bossHp / 100) * BOSS_MAX)} max={BOSS_MAX} variant="boss" />
            </div>
            <div className="tr-hp party">
              <HpBar label="PARTY" hp={partyHp} max={100} variant="party" />
            </div>
          </div>
        )}
        {between(t, FIGHT, FIGHT + 2300) && <StepCard t={t} start={FIGHT} n={4} ja="魔法を放て" en="CAST TOGETHER" />}
        {flash > 0 && between(t, ENEMY_TURN, ENEMY_TURN + 600) && <div key={flash} className="flash" />}
      </section>

      {/* finale */}
      <section className={`tr-scene tr-finale ${t >= FINALE ? 'show' : ''}`}>
        {t >= FINALE && (
          <>
            <div className="bridge-scene" aria-hidden>
              <div className="shore left">関西</div>
              <div className="bridge">
                {Array.from({ length: 12 }, (_, i) => (
                  <span key={i} style={{ '--i': i } as React.CSSProperties} />
                ))}
              </div>
              <div className="shore right">Kansai</div>
            </div>
            <div className="end-party cheer">
              {AVATARS.map((a) => (
                <Sprite key={a.id} avatar={a.id} size={52} walk />
              ))}
            </div>
            {t >= FINALE + 2600 && (
              <div className="tr-logo">
                <b>言葉の壁</b>
                <small>THE LANGUAGE WALL</small>
                <span>Bridge Kansai · 関西をつなぐ</span>
                {t >= FINALE + 4000 && <em>Judged by TypeSafe Jev</em>}
              </div>
            )}
            {t >= FINALE + 5200 && <PlayCard />}
          </>
        )}
      </section>

      <div className={`tr-fade ${t >= END - 1000 ? 'show' : ''}`} />
      {t >= END && (
        <button type="button" className="tr-start replay" onClick={onReplay}>
          ↻ REPLAY
        </button>
      )}
    </div>
  );
}

function PlayCard() {
  const [src, setSrc] = useState('');
  useEffect(() => {
    void QRCode.toDataURL(`https://${PLAY_URL}`, { margin: 1, width: 240, color: { dark: '#000010', light: '#f4f4f4' } }).then(setSrc);
  }, []);
  return (
    <div className="tr-play">
      {src && <img src={src} width={120} height={120} alt="" />}
      <div>
        <b>Scan to play · 今すぐ参戦!</b>
        <span>{PLAY_URL}</span>
      </div>
    </div>
  );
}
