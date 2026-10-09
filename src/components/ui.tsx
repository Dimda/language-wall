import { useEffect, useState } from 'react';
import type { Ruby } from '../../shared/types';

export function useTypewriter(text: string, msPerChar = 28): string {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const t = setInterval(() => {
      setN((v) => {
        if (v >= text.length) {
          clearInterval(t);
          return v;
        }
        return v + 1;
      });
    }, msPerChar);
    return () => clearInterval(t);
  }, [text, msPerChar]);
  return text.slice(0, n);
}

export function Typewriter({ text, ms }: { text: string; ms?: number }) {
  const shown = useTypewriter(text, ms);
  return <>{shown}</>;
}

export function useNow(intervalMs = 250): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function HpBar({ label, hp, max, variant }: { label: string; hp: number; max: number; variant: 'boss' | 'party' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  const level = pct > 50 ? 'ok' : pct > 20 ? 'mid' : 'low';
  return (
    <div className={`hpbar hpbar-${variant}`}>
      <div className="hpbar-label">
        <span>{label}</span>
        <span>
          {hp}/{max}
        </span>
      </div>
      <div className="hpbar-track">
        <div className="hpbar-lag" style={{ width: `${pct}%` }} />
        <div className={`hpbar-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Japanese with furigana: hiragana readings rendered above kanji using <ruby>. */
export function RubyText({ ruby }: { ruby: Ruby }) {
  return (
    <span className="ruby-text">
      {ruby.map((seg, i) =>
        typeof seg === 'string' ? (
          <span key={i}>{seg}</span>
        ) : (
          <ruby key={i}>
            {seg[0]}
            <rp>(</rp>
            <rt>{seg[1]}</rt>
            <rp>)</rp>
          </ruby>
        ),
      )}
    </span>
  );
}

/** Plain text with a typewriter effect, or furigana text (shown whole) when a reading is available. */
export function SpokenText({ text, ruby, ms }: { text: string; ruby?: Ruby; ms?: number }) {
  return ruby ? <RubyText ruby={ruby} /> : <Typewriter text={text} ms={ms} />;
}
