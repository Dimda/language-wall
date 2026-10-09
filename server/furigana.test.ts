import { describe, expect, it } from 'vitest';
import { furigana, furiganaReady } from './furigana';

describe('furigana', () => {
  it('puts hiragana over kanji only, keeping okurigana bare', async () => {
    await furiganaReady;
    expect(furigana('友達')).toEqual([['友達', 'ともだち']]);
    expect(furigana('待ち合わせ')).toEqual([['待', 'ま'], 'ち', ['合', 'あ'], 'わせ']);
    expect(furigana('お疲れ様')).toEqual(['お', ['疲', 'つか'], 'れ', ['様', 'さま']]);
    expect(furigana('新しい友達を作る')).toEqual([['新', 'あたら'], 'しい', ['友達', 'ともだち'], 'を', ['作', 'つく'], 'る']);
  });

  it('returns nothing for text without kanji', async () => {
    await furiganaReady;
    expect(furigana('おおきに')).toBeUndefined();
    expect(furigana('high five')).toBeUndefined();
  });

  it('uses hand-checked readings where the analyzer differs', () => {
    expect(furigana('一期一会')).toEqual([['一期一会', 'いちごいちえ']]);
  });
});
