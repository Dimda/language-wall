import type { Term } from './types';

const ja = ['炎上', '仕様です', '工数', '叩き台', '手戻り', '横展開', '枯れた技術', 'デスマーチ', '人月', '巻き取る'];
const en = [
  'yak shaving',
  'bikeshedding',
  'rubber duck debugging',
  'ship it',
  'dogfooding',
  'footgun',
  'LGTM',
  'works on my machine',
];

export const WORDS: Term[] = [
  ...ja.map((text, i) => ({ id: `ja${i}`, text, lang: 'ja' as const })),
  ...en.map((text, i) => ({ id: `en${i}`, text, lang: 'en' as const })),
];
