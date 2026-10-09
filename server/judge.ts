import type { JudgeResult, Lang, Tier } from '../shared/types';

/**
 * Judges how much of the original word's meaning survived the chain.
 * `finalLang` differs from `lang` when a chain has an odd number of hops.
 */
export type Judge = (original: string, final: string, lang: Lang, finalLang?: Lang) => Promise<JudgeResult>;

export const normalize = (s: string): string =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]/gu, '');

const EXACT: JudgeResult = { exact: 1, same_concept: 0, related: 0, lost: 0, confidence: 1 };

/** Mock: exact on normalized match, otherwise a random "dominant" verdict so all tiers show up. */
export const mockJudge: Judge = async (original, final) => {
  if (normalize(original) === normalize(final)) return EXACT;
  const r = Math.random();
  const dominant = r < 0.45 ? 'same_concept' : r < 0.8 ? 'related' : 'lost';
  const result: JudgeResult = { exact: Math.random() * 0.1, same_concept: 0, related: 0, lost: 0 };
  result[dominant] = 0.55 + Math.random() * 0.3;
  const others = (['same_concept', 'related', 'lost'] as const).filter((k) => k !== dominant);
  const rest = 1 - result.exact - result[dominant];
  const split = Math.random();
  result[others[0]] = rest * split;
  result[others[1]] = rest * (1 - split);
  return result;
};

// ── TypeSafe Jev ──────────────────────────────────────

const TYPESAFE_URL = 'https://api.typesafe.ai/v1/systemone';
const LANG_NAME: Record<Lang, string> = { ja: 'Japanese', en: 'English' };

/** One Choice question whose options are exactly our verdict categories. */
const MEANING_QUESTION = {
  type: 'choice',
  instructions:
    'Players passed `original` through a chain of translations between Japanese and English, ending with `final`. ' +
    'How much of the meaning of `original` does `final` keep? Judge meaning, not wording or language: a correct ' +
    'translation into the other language counts as the same. Idioms and set phrases carry their idiomatic meaning: a ' +
    'literal word-for-word translation that loses it (e.g. "break the ice" → 氷を割る, "smashing ice") has not kept the meaning.',
  criteria: {
    exact: 'Means exactly the same thing as `original` — the same word, a synonym, or its precise translation (e.g. 友達 and "friend").',
    same_concept: 'Same core idea, expressed differently — a description or paraphrase, or slightly broader or narrower.',
    related: 'Related topic or partly right, but the core meaning has drifted.',
    lost: 'Unrelated or opposite; the meaning was lost.',
  },
} as const;

interface JevOptions {
  timeoutMs?: number;
  /** Used when Jev fails, so a spell never hangs. */
  fallback?: Judge;
  fetchImpl?: typeof fetch;
}

/** Jev judge. A normalized exact match is a guaranteed hit and never calls the API. */
export function jevJudge(apiKey: string, { timeoutMs = 8000, fallback = mockJudge, fetchImpl = fetch }: JevOptions = {}): Judge {
  return async (original, final, lang, finalLang = lang) => {
    if (normalize(original) === normalize(final)) return EXACT;
    const body = JSON.stringify({
      model: 'jev-latest',
      state: {
        original: { text: original, language: LANG_NAME[lang] },
        final: { text: final, language: LANG_NAME[finalLang] },
      },
      questions: { meaning: MEANING_QUESTION },
    });
    try {
      for (let attempt = 0; ; attempt++) {
        const res = await fetchImpl(TYPESAFE_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
        // Rate limited / overloaded: one short backoff, then give up to the fallback.
        if ((res.status === 429 || res.status === 529) && attempt === 0) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        if (!res.ok) throw new Error(`TypeSafe ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const data = (await res.json()) as {
          answers?: { meaning?: { probabilities?: Partial<JudgeResult>; confidence?: number } };
        };
        const answer = data.answers?.meaning;
        const p = answer?.probabilities;
        if (!p) throw new Error('TypeSafe response had no probabilities');
        return {
          exact: p.exact ?? 0,
          same_concept: p.same_concept ?? 0,
          related: p.related ?? 0,
          lost: p.lost ?? 0,
          confidence: answer.confidence,
        };
      }
    } catch (err) {
      console.warn('[judge] Jev failed, using fallback judge:', err instanceof Error ? err.message : err);
      return fallback(original, final, lang, finalLang);
    }
  };
}

// ── damage ────────────────────────────────────────────

export const WEIGHTS = { exact: 100, same_concept: 70, related: 30, lost: 0 } as const;
export const CRIT_THRESHOLD = 0.9;
export const CRIT_MULTIPLIER = 1.5;

export type Verdict = 'exact' | 'same_concept' | 'related' | 'lost';

/** The judge's verdict (most likely category) and its confidence, 0–1. */
export function verdictOf(r: JudgeResult): { verdict: Verdict; confidence: number } {
  const verdicts: Verdict[] = ['exact', 'same_concept', 'related', 'lost'];
  const verdict = verdicts.reduce((best, v) => (r[v] > r[best] ? v : best), verdicts[0]);
  // Jev reports its own confidence; the mock falls back to the winning probability.
  return { verdict, confidence: r.confidence ?? r[verdict] };
}

export const BROKEN: JudgeResult = { exact: 0, same_concept: 0, related: 0, lost: 1 };

export function damageFrom(r: JudgeResult): { damage: number; tier: Tier } {
  const base =
    WEIGHTS.exact * r.exact + WEIGHTS.same_concept * r.same_concept + WEIGHTS.related * r.related + WEIGHTS.lost * r.lost;
  if (r.exact > CRIT_THRESHOLD) return { damage: Math.round(base * CRIT_MULTIPLIER), tier: 'perfect' };
  const tier: Tier = base >= 55 ? 'strong' : base >= 30 ? 'weak' : 'fizzle';
  return { damage: tier === 'fizzle' ? 0 : Math.round(base), tier };
}

/**
 * The judge the game uses: Jev when TYPESAFE_API_KEY is set, otherwise the mock.
 * Resolved per call so the key can be loaded after this module is imported.
 */
let jev: Judge | null = null;
export const judge: Judge = (...args) => {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) return mockJudge(...args);
  jev ??= jevJudge(key);
  return jev(...args);
};
