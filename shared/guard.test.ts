import { describe, expect, it } from 'vitest';
import { checkAnswer } from './guard';

describe('answer guard', () => {
  it('accepts real translations', () => {
    expect(checkAnswer('居酒屋', 'a casual Japanese pub', 'en')).toBeNull();
    expect(checkAnswer('high five', 'ハイタッチ', 'ja')).toBeNull();
    expect(checkAnswer('仲直り', 'making up after a fight', 'en')).toBeNull();
    expect(checkAnswer('making up after a fight', '仲直り', 'ja')).toBeNull();
    expect(checkAnswer('small talk', '世間話', 'ja')).toBeNull();
  });

  it('rejects reusing the received word', () => {
    expect(checkAnswer('居酒屋', 'izakaya 居酒屋', 'en')).not.toBeNull(); // also wrong language
    expect(checkAnswer('仲直り', '仲直りする', 'ja')).not.toBeNull();
    expect(checkAnswer('high five', 'ハイファイブ high five', 'ja')).not.toBeNull();
    expect(checkAnswer('road trip', '車でroadの旅', 'ja')).not.toBeNull();
    expect(checkAnswer('Best Friend', 'best-friend！', 'en')?.en).toBe("Don't reuse the word you received");
  });

  it('rejects the wrong language', () => {
    expect(checkAnswer('友達', 'ともだち', 'en')?.en).toBe('Please write it in English only');
    expect(checkAnswer('homesick', 'homesick feeling', 'ja')?.en).toBe('Please write it in Japanese');
  });

  it('ignores filler words shared between input and answer', () => {
    expect(checkAnswer('something like a party', 'something like a celebration', 'en')).toBeNull();
  });
});
