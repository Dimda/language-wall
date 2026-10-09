import { writeFileSync } from 'node:fs';
import { furigana, furiganaReady } from '../server/furigana';
import { WORDS } from '../shared/words';
await furiganaReady;
const entries = WORDS.filter((w) => w.lang === 'ja').map((w) => [w.text, furigana(w.text)] as const).filter(([, r]) => r);
const body = entries.map(([t, r]) => `  ${JSON.stringify(t)}: ${JSON.stringify(r)},`).join('\n');
writeFileSync(
  new URL('../shared/vocabRuby.ts', import.meta.url),
  `import type { Ruby } from './types';

/**
 * Furigana for every Japanese vocabulary term, pre-computed (kuromoji + hand-checked overrides) so
 * the word list always has readings even when the analyzer can't load on the server.
 * Regenerate after changing shared/words.ts: \`pnpm vocab:ruby\`.
 */
export const VOCAB_RUBY: Record<string, Ruby> = {
${body}
};
`,
);
console.log(`wrote ${entries.length} entries`);
process.exit(0);
