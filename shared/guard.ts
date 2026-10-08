import type { Lang } from './types';

/**
 * Guard against "translating" by passing the received word along: an answer may not reuse the
 * received word (or a significant piece of it) and must be written in the target language.
 * Returns a bilingual reason when the answer is rejected, or null when it's fine.
 */

export interface Rejection {
  ja: string;
  en: string;
}

const JA_CHARS = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;
/** Kanji / katakana runs of 2+ characters — the meaningful parts of a Japanese word. */
const JA_CONTENT_RUN = /[゠-ヿ㐀-鿿ｦ-ﾟ]{2,}/g;
/** Filler English words that may legitimately appear in both input and answer. */
const EN_STOPWORDS = new Set(['something', 'like', 'that', 'this', 'with', 'when', 'what', 'from', 'your', 'have', 'they', 'them', 'there', 'their', 'about', 'very', 'just', 'into', 'some', 'kind', 'thing', 'things', 'people', 'person', 'other']);

const normalize = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '');

/** The pieces of the received text that must not show up in the answer. */
function forbiddenPieces(input: string): string[] {
  const text = input.normalize('NFKC').toLowerCase();
  const pieces = new Set<string>();
  const whole = normalize(input);
  if (whole.length >= 2) pieces.add(whole);
  for (const run of text.match(JA_CONTENT_RUN) ?? []) pieces.add(run);
  for (const word of text.match(/[a-z]{4,}/g) ?? []) if (!EN_STOPWORDS.has(word)) pieces.add(word);
  return [...pieces];
}

export function checkAnswer(input: string, answer: string, toLang: Lang): Rejection | null {
  const clean = answer.trim();
  if (!clean) return { ja: '何か入力してね', en: 'Type something first' };

  if (toLang === 'ja' && !JA_CHARS.test(clean)) {
    return { ja: '日本語で書いてね', en: 'Please write it in Japanese' };
  }
  if (toLang === 'en' && JA_CHARS.test(clean)) {
    return { ja: '英語だけで書いてね', en: 'Please write it in English only' };
  }

  const answerText = clean.normalize('NFKC').toLowerCase();
  const answerFlat = normalize(clean);
  for (const piece of forbiddenPieces(input)) {
    const hit = /^[a-z]+$/.test(piece)
      ? new RegExp(`\\b${piece}\\b`).test(answerText)
      : answerFlat.includes(normalize(piece)) || answerText.includes(piece);
    if (hit) return { ja: '届いた言葉をそのまま使わないでね', en: "Don't reuse the word you received" };
  }
  return null;
}
