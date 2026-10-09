import { describe, expect, it, vi } from 'vitest';
import { jevJudge, verdictOf } from './judge';

const okResponse = (probabilities: Record<string, number>) =>
  new Response(JSON.stringify({ answers: { meaning: { type: 'choice', choice: 'x', probabilities, confidence: 1 } } }), {
    status: 200,
  });

describe('Jev judge', () => {
  it('marks an exact (normalized) match as a full hit without calling Jev', async () => {
    const fetchImpl = vi.fn();
    const judge = jevJudge('k', { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(await judge('Best Friend', 'best friend!', 'en')).toEqual({ exact: 1, same_concept: 0, related: 0, lost: 0, confidence: 1 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps Jev choice probabilities to the verdict and sends both languages', async () => {
    const fetchImpl = vi.fn(async () => okResponse({ exact: 0.1, same_concept: 0.7, related: 0.15, lost: 0.05 }));
    const judge = jevJudge('secret', { fetchImpl: fetchImpl as unknown as typeof fetch });
    expect(await judge('仲直り', 'making up after a fight', 'ja', 'en')).toEqual({
      exact: 0.1,
      same_concept: 0.7,
      related: 0.15,
      lost: 0.05,
      confidence: 1,
    });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('jev-latest');
    expect(body.state.final.language).toBe('English');
    expect(Object.keys(body.questions.meaning.criteria)).toEqual(['exact', 'same_concept', 'related', 'lost']);
  });

  it('falls back when Jev fails', async () => {
    const fallback = vi.fn(async () => ({ exact: 0, same_concept: 0, related: 1, lost: 0 }));
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 500 }));
    const judge = jevJudge('k', { fetchImpl: fetchImpl as unknown as typeof fetch, fallback });
    expect(await judge('友達', 'pal', 'ja', 'en')).toEqual({ exact: 0, same_concept: 0, related: 1, lost: 0 });
    expect(fallback).toHaveBeenCalledOnce();
  });
});

describe('verdict', () => {
  it('reports the most likely category with Jev confidence, or its probability as a fallback', () => {
    expect(verdictOf({ exact: 0.1, same_concept: 0.7, related: 0.15, lost: 0.05, confidence: 0.81 })).toEqual({ verdict: 'same_concept', confidence: 0.81 });
    expect(verdictOf({ exact: 0.1, same_concept: 0.2, related: 0.6, lost: 0.1 })).toEqual({ verdict: 'related', confidence: 0.6 });
  });
});
