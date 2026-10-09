import { describe, expect, it } from 'vitest';
import { WORDS } from './words';

describe('word pool', () => {
  it('is large, balanced between languages and has no duplicates', () => {
    const ja = WORDS.filter((w) => w.lang === 'ja');
    const en = WORDS.filter((w) => w.lang === 'en');
    expect(ja.length).toBeGreaterThanOrEqual(60);
    expect(en.length).toBeGreaterThanOrEqual(60);
    expect(new Set(WORDS.map((w) => w.text)).size).toBe(WORDS.length);
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
  });

  it('mixes single words and phrases, all short enough for one hop', () => {
    expect(WORDS.some((w) => w.lang === 'en' && w.text.split(' ').length >= 3)).toBe(true);
    expect(WORDS.some((w) => w.lang === 'ja' && w.text.length >= 6)).toBe(true);
    for (const w of WORDS) expect(w.text.length).toBeLessThanOrEqual(30);
  });

  it('keeps each term in its own script', () => {
    for (const w of WORDS) {
      const hasJa = /[぀-ヿ㐀-鿿]/.test(w.text);
      expect(hasJa).toBe(w.lang === 'ja');
    }
  });
});
