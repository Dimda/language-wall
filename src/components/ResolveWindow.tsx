import type { ResolveTimeline, Tier } from '../../shared/types';
import { ELEMENT_COLOR, ELEMENT_LABEL } from './sprites';
import { Typewriter } from './ui';

export type ResolveStage = 'reveal' | 'judge' | 'spell' | 'done';

export function stageAt(t: ResolveTimeline, elapsed: number): ResolveStage {
  if (elapsed < t.revealMs) return 'reveal';
  if (elapsed < t.revealMs + t.judgeMs) return 'judge';
  if (elapsed < t.revealMs + t.judgeMs + t.spellMs) return 'spell';
  return 'done';
}

export const TIER_LABEL: Record<Tier, { ja: string; en: string }> = {
  perfect: { ja: '完璧!!', en: 'PERFECT!!' },
  strong: { ja: '通じた!', en: 'IT GOT THROUGH!' },
  weak: { ja: '惜しい…', en: 'SO CLOSE…' },
  fizzle: { ja: 'ぷすん…', en: 'LOST IN TRANSLATION' },
};

const BARS = [
  { key: 'exact', label: 'EXACT' },
  { key: 'same_concept', label: 'SAME IDEA' },
  { key: 'related', label: 'RELATED' },
  { key: 'lost', label: 'LOST' },
] as const;

/** Plays one spell's story: the word's journey hop by hop, then the judge's verdict. */
export function ResolveWindow({ timeline, elapsed }: { timeline: ResolveTimeline; elapsed: number }) {
  const { chain } = timeline;
  const stage = stageAt(timeline, elapsed);
  const lineMs = timeline.revealMs / (chain.hops.length + 1);
  const shownHops = Math.min(chain.hops.length, Math.floor(elapsed / lineMs));
  const judgeK = Math.min(1, Math.max(0, (elapsed - timeline.revealMs) / (timeline.judgeMs * 0.7)));
  const verdictShown = elapsed > timeline.revealMs + timeline.judgeMs * 0.75;
  const el = ELEMENT_LABEL[chain.element];

  if (stage === 'spell' || stage === 'done') return null;

  return (
    <div className="resolve window" style={{ '--el': ELEMENT_COLOR[chain.element] } as React.CSSProperties}>
      <div className="resolve-head">
        <span>
          SPELL {timeline.index + 1}/{timeline.total}
          {chain.teamName && <> · {chain.teamName}</>}
        </span>
        <span className="el-name">
          {el.icon} {el.ja} {el.en}
          {chain.multiplier > 1 && (
            <b className="chain-bonus">
              {' '}
              {chain.hops.length}-HOP ×{chain.multiplier}
            </b>
          )}
        </span>
      </div>

      {stage === 'reveal' ? (
        <ol className="journey">
          <li className="journey-term">
            <span className="who">お題 {chain.term.lang.toUpperCase()}</span>
            <span className="said">「{chain.term.text}」</span>
          </li>
          {chain.hops.slice(0, shownHops).map((h, i) => (
            <li key={i}>
              <span className="who">
                {h.playerName} → {h.toLang.toUpperCase()}
              </span>
              <span className="said">
                「<Typewriter text={h.output ?? ''} ms={24} />」
              </span>
            </li>
          ))}
          {chain.broken && shownHops >= chain.hops.length && (
            <li className="broken">
              <span className="said">…… (the spell broke off)</span>
            </li>
          )}
        </ol>
      ) : (
        <div className="judging">
          <p className="compare">
            「{chain.term.text}」 <span className="arrow">⇒</span> 「{chain.final || '……'}」
          </p>
          <div className="bars">
            {BARS.map((b) => (
              <div key={b.key} className="bar-row">
                <span>{b.label}</span>
                <div className="bar-track">
                  <div className={`bar-fill ${b.key}`} style={{ width: `${chain.judge[b.key] * 100 * judgeK}%` }} />
                </div>
                <span>{Math.round(chain.judge[b.key] * 100 * judgeK)}%</span>
              </div>
            ))}
          </div>
          {verdictShown ? (
            <p className={`verdict tier-${chain.tier}`}>
              {TIER_LABEL[chain.tier].ja} {TIER_LABEL[chain.tier].en}
            </p>
          ) : (
            <p className="verdict blink">判定中… JUDGING</p>
          )}
        </div>
      )}
    </div>
  );
}
