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

const JA_CHARS = /[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]/;
/** Into English: English letters, digits, spaces and everyday punctuation only. */
const EN_ONLY = /^[A-Za-z0-9\s.,!?'"()\-:;&/]+$/;
/** Into Japanese: kana, kanji, Japanese punctuation and long-vowel marks, digits and spaces — no Latin letters. */
const JA_ONLY = /^[\u3000-\u303f\u3040-\u30ff\u3400-\u9fff\uff01-\uff20\uff3b-\uff40\uff5b-\uff9f0-9\s.,!?()~\u2026\u30fb]+$/;
/** Kanji / katakana runs of 2+ characters — the meaningful parts of a Japanese word. */
const JA_CONTENT_RUN = /[\u30a0-\u30ff\u3400-\u9fff\uff66-\uff9f]{2,}/g;
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

  if (toLang === 'ja' && (!JA_CHARS.test(clean) || !JA_ONLY.test(clean))) {
    return { ja: '日本語の文字だけで書いてね（英字はNG）', en: 'Use Japanese characters only — no English letters' };
  }
  if (toLang === 'en' && !EN_ONLY.test(clean)) {
    return { ja: '英字だけで書いてね（日本語はNG）', en: 'Use English letters only — no Japanese' };
  }

  const answerText = clean.normalize('NFKC').toLowerCase();
  const answerFlat = normalize(clean);
  for (const piece of forbiddenPieces(input)) {
    const hit = /^[a-z]+$/.test(piece)
      ? new RegExp(`\\b${piece}\\b`).test(answerText)
      : answerFlat.includes(normalize(piece)) || answerText.includes(piece);
    if (hit) return { ja: '届いた言葉と同じ言葉は使えません', en: "You can't use the same word(s) you received" };
  }
  return null;
}
