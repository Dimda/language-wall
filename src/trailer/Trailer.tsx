import QRCode from 'qrcode';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AVATAR_IDS, type AvatarId, type Element, IMPACT_MS, type PlayerPublic, type Tier } from '../../shared/types';
import { audio } from '../audio';
import { Boss } from '../components/Boss';
import { Fighter } from '../components/Fighter';
import { KansaiBackdrop } from '../components/KansaiBackdrop';
import { TIER_LABEL } from '../components/ResolveWindow';
import { AVATARS, Sprite } from '../components/sprites';
import { HpBar, Typewriter } from '../components/ui';
import { SpellFX } from '../spellfx';
import './trailer.css';

/**
 * Cinematic ~55s trailer built from the game's own art, music and effects. Renders a fixed
 * 1280×720 frame scaled to the window. Open with `?trailer` (add `&autoplay` to skip the button).
 */

const FRAME_W = 1280;
const FRAME_H = 720;
const PLAY_URL = new URLSearchParams(location.search).get('url') ?? 'language-wall.onrender.com';

// Scene start times (ms)
const INTRO = 0;
const SKY = 4800;
const BOSS = 8800;
const HEROES = 14200;
const CHAIN = 20200;
const FIGHT = 29800;
const CASTS: { at: number; element: Element; tier: Tier; hp: number; casters: number[] }[] = [
  { at: FIGHT + 700, element: 'fire', tier: 'strong', hp: 76, casters: [0, 1] },
  { at: FIGHT + 3700, element: 'thunder', tier: 'strong', hp: 52, casters: [2, 3] },
  { at: FIGHT + 6700, element: 'ice', tier: 'perfect', hp: 18, casters: [0, 3] },
  { at: FIGHT + 9700, element: 'light', tier: 'perfect', hp: 0, casters: [0, 1, 2, 3] },
];
const KILL = CASTS[CASTS.length - 1].at + IMPACT_MS;
const FINALE = KILL + 5200;
const END = FINALE + 10500;

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
  const playing = run > 0;
  const t = useClock(run);
  const scale = useFrameScale();

  return (
    <div className="trailer-root">
      <div className="trailer-frame" style={{ transform: `scale(${scale})` }}>
        {playing ? (
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

function TrailerScenes({ t, onReplay }: { t: number; onReplay: () => void }) {
  const [bossHp, setBossHp] = useState(100);
  const [hitKey, setHitKey] = useState(0);
  const [floats, setFloats] = useState<{ id: number; amount: number; tier: Tier }[]>([]);
  const [tier, setTier] = useState<{ id: number; tier: Tier } | null>(null);
  const [channel, setChannel] = useState<{ ids: number[]; element: Element } | null>(null);
  const [banner, setBanner] = useState<{ id: number; text: string; sub: string } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const bossRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fx = useRef<SpellFX | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  // Scripted events: music, sound effects, spell casts and boss damage.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const shake = (strength: number, ms: number) =>
      frameRef.current?.animate(
        [0, -strength, strength, -strength / 2, strength / 2, 0].map((x, i) => ({ transform: `translate(${x}px, ${i % 2 ? strength / 3 : 0}px)` })),
        { duration: ms, easing: 'steps(6)' },
      );
    const center = (el: { getBoundingClientRect(): DOMRect } | null | undefined) => {
      const stage = stageRef.current?.getBoundingClientRect();
      const r = el?.getBoundingClientRect();
      return stage && r ? { x: r.left - stage.left + r.width / 2, y: r.top - stage.top + r.height / 2 } : null;
    };

    audio.play('quiet');
    at(INTRO + 300, () => audio.sfx('blip'));
    at(BOSS + 500, () => {
      audio.sfx('boss');
      shake(10, 700);
    });
    at(BOSS + 1700, () => {
      audio.play('battle');
      audio.sfx('crit');
      shake(16, 500);
    });
    for (let i = 0; i < AVATAR_IDS.length; i++) at(HEROES + 900 + i * 280, () => audio.sfx('select'));
    at(CHAIN + 600, () => audio.sfx('blip'));
    at(CHAIN + 2400, () => audio.sfx('submit'));
    at(CHAIN + 5200, () => audio.sfx('submit'));
    at(CHAIN + 6800, () => audio.sfx('judge'));
    at(CHAIN + 8000, () => audio.sfx('select'));

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
        setFloats((f) => [...f, { id: i + 1, amount: Math.round((prev - c.hp) * 4.8), tier: c.tier }]);
        audio.sfx(c.tier === 'perfect' ? 'crit' : 'hit');
        shake(c.tier === 'perfect' ? 16 : 8, c.tier === 'perfect' ? 600 : 300);
      });
    });

    at(KILL, () => {
      audio.play(null);
      audio.sfx('crumble');
      shake(6, 1200);
    });
    at(KILL + 1200, () => {
      shake(22, 900);
      setBanner({ id: 1, text: '言葉の壁が崩れた!', sub: 'THE WALL CRUMBLES!' });
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

  const bossShown = t >= BOSS && t < CHAIN;
  const fighting = t >= FIGHT && t < FINALE;

  return (
    <div ref={frameRef} className="tr-frame-inner">
      {/* 1. intro */}
      <section className={`tr-scene tr-intro ${between(t, INTRO, SKY + 600) ? 'show' : ''}`}>
        {t >= 400 && <p className="tr-line big"><Typewriter text="関西。" ms={120} /></p>}
        {t >= 1500 && <p className="tr-line"><Typewriter text="Japanese devs. English devs." ms={40} /></p>}
        {t >= 3000 && <p className="tr-line"><Typewriter text="Same bugs. Different words." ms={40} /></p>}
      </section>

      {/* 2–3. skyline + boss reveal */}
      <section className={`tr-scene tr-stage-scene ${between(t, SKY, CHAIN) ? 'show' : ''}`}>
        <div className="tr-stage">
          <KansaiBackdrop />
          {bossShown && (
            <div className="tr-boss-rise">
              <Boss hpPct={100} hitKey={0} />
            </div>
          )}
        </div>
        {between(t, SKY + 800, BOSS + 200) && <p className="tr-caption">But between them stands…</p>}
        {t >= BOSS + 1700 && t < HEROES && (
          <div className="tr-title">
            <b>言葉の壁</b>
            <small>THE LANGUAGE WALL</small>
          </div>
        )}
        {t >= HEROES && t < CHAIN && (
          <div className="tr-heroes">
            <p className="tr-caption top">Choose your fighter · 12 Kansai heroes</p>
            <div className="tr-hero-grid">
              {AVATARS.map((a, i) =>
                t >= HEROES + 900 + i * 280 ? (
                  <div key={a.id} className="tr-hero">
                    <Sprite avatar={a.id} size={92} />
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

      {/* 4. the chain mechanic */}
      <section className={`tr-scene tr-chain ${between(t, CHAIN, FIGHT) ? 'show' : ''}`}>
        <p className="tr-caption top">Pass the word across languages</p>
        <div className="window tr-journey">
          {t >= CHAIN + 600 && (
            <div className="tr-hop">
              <span className="who">お題 JA</span>
              <span className="said term">「炎上」</span>
            </div>
          )}
          {t >= CHAIN + 1600 && (
            <div className="tr-hop">
              <span className="who">
                <Sprite avatar="obachan" size={44} /> Aiko → EN
              </span>
              <span className="said">
                「<Typewriter text="when the whole internet gets angry at you" ms={34} />」
              </span>
            </div>
          )}
          {t >= CHAIN + 4200 && (
            <div className="tr-hop">
              <span className="who">
                <Sprite avatar="gaijin" size={44} /> Sam → JA
              </span>
              <span className="said">
                「<Typewriter text="大炎上" ms={160} />」
              </span>
            </div>
          )}
          {t >= CHAIN + 6600 && (
            <div className="tr-judge">
              <div className="bars">
                {(
                  [
                    ['EXACT', 'exact', 0.12],
                    ['SAME IDEA', 'same_concept', 0.74],
                    ['RELATED', 'related', 0.12],
                    ['LOST', 'lost', 0.02],
                  ] as const
                ).map(([label, key, v]) => {
                  const k = Math.min(1, (t - CHAIN - 6600) / 1200);
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
              {t >= CHAIN + 8000 && <p className="verdict tier-strong">通じた! IT GOT THROUGH!</p>}
            </div>
          )}
        </div>
        <p className="tr-caption bottom">Explain it — don't translate it word for word. / 直訳じゃなく、説明しよう。</p>
      </section>

      {/* 5–6. spells + boss death */}
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
                    hurtKey={0}
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
              <HpBar label="言葉の壁 / THE LANGUAGE WALL" hp={Math.round(bossHp * 4.8)} max={480} variant="boss" />
            </div>
          </div>
        )}
        {between(t, FIGHT, FIGHT + 2400) && <p className="tr-caption top">Every word you pass becomes a spell</p>}
      </section>

      {/* 7. finale */}
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
                <Sprite key={a.id} avatar={a.id} size={52} />
              ))}
            </div>
            {t >= FINALE + 2600 && (
              <div className="tr-logo">
                <b>言葉の壁</b>
                <small>THE LANGUAGE WALL</small>
                <span>Bridge Kansai · 関西をつなぐ</span>
              </div>
            )}
            {t >= FINALE + 5000 && <PlayCard />}
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
