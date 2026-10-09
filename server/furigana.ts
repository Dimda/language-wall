import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import kuromoji from 'kuromoji';
import type { Ruby } from '../shared/types';

/**
 * Furigana (hiragana readings over kanji) for any Japanese text, via the kuromoji analyzer.
 * The dictionary loads once at startup; until it's ready, `furigana()` returns undefined and the
 * client simply shows plain text.
 */

type Tokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

const HAS_KANJI = /[㐀-鿿々]/;

/** Readings kuromoji gets wrong (or reads differently than everyday speech) for our vocabulary. */
const OVERRIDES: Record<string, Ruby> = {
  一期一会: [['一期一会', 'いちごいちえ']],
  二次会: [['二次会', 'にじかい']],
};

let tokenizer: Tokenizer | null = null;

const require = createRequire(import.meta.url);
const dicPath = join(dirname(require.resolve('kuromoji/package.json')), 'dict');

export const furiganaReady: Promise<void> = new Promise((resolve) => {
  kuromoji.builder({ dicPath }).build((err, t) => {
    if (err) console.warn('[furigana] dictionary failed to load:', err.message);
    else tokenizer = t;
    resolve();
  });
});

const toHiragana = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/**
 * Put readings over the kanji of one word, leaving its kana bare. Kana inside the word are matched
 * against the reading to split it (待ち合わせ → 待(ま)ち合(あ)わせ); falls back to one reading over
 * the whole word when the split is ambiguous.
 */
function splitWord(surface: string, reading: string): Ruby {
  // runs of kanji vs kana: 待|ち|合|わせ
  const runs = surface.match(/[\u3040-\u30ff]+|[^\u3040-\u30ff]+/g) ?? [surface];
  const isKanaRun = (r: string) => /^[\u3040-\u30ff]+$/.test(r);
  const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = runs.map((r) => (isKanaRun(r) ? `(${escape(toHiragana(r))})` : '(.+?)')).join('');
  const m = new RegExp(`^${pattern}$`).exec(reading);
  if (!m) return [[surface, reading]];
  return runs.map((r, i) => (isKanaRun(r) ? r : ([r, m[i + 1]] as [string, string])));
}

/** Ruby segments for `text`, or undefined when it has no kanji (or the dictionary isn't loaded). */
export function furigana(text: string): Ruby | undefined {
  if (!HAS_KANJI.test(text)) return undefined;
  if (OVERRIDES[text]) return OVERRIDES[text];
  if (!tokenizer) return undefined;
  const out: Ruby = [];
  for (const token of tokenizer.tokenize(text)) {
    const surface = token.surface_form;
    const reading = token.reading && token.reading !== '*' ? toHiragana(token.reading) : '';
    if (HAS_KANJI.test(surface) && reading) out.push(...splitWord(surface, reading));
    else out.push(surface);
  }
  // merge neighbouring plain strings
  return out.reduce<Ruby>((acc, seg) => {
    const last = acc[acc.length - 1];
    if (typeof seg === 'string' && typeof last === 'string') acc[acc.length - 1] = last + seg;
    else acc.push(seg);
    return acc;
  }, []);
}
