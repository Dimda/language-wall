import type { Term } from './types';

/**
 * Casual, everyday words on a "bridging" theme: meeting people, making friends, getting along —
 * plus a little Kansai flavour. Easy to explain without any special vocabulary.
 */
const ja = [
  '友達', // friend
  '仲直り', // making up after a fight
  '待ち合わせ', // meeting up at a set place
  'おもてなし', // heartfelt hospitality
  '乾杯', // cheers!
  'いただきます', // said before eating
  'お疲れ様', // "good work / thanks for your effort"
  '懐かしい', // nostalgic
  'もったいない', // what a waste
  '迷子', // lost (and can't find the way)
  '花見', // cherry-blossom viewing party
  '食べ放題', // all-you-can-eat
  '居酒屋', // casual Japanese pub
  '自撮り', // selfie
  'おおきに', // Kansai "thank you"
  'なんでやねん', // Kansai "why on earth?!"
];

const en = [
  'bridge',
  'break the ice',
  'small talk',
  'best friend',
  'high five',
  'homesick',
  'road trip',
  'hang out',
  'potluck',
  'group photo',
  'inside joke',
  'long time no see',
  'teamwork',
  'welcome party',
  'sleepover',
  'make friends',
];

export const WORDS: Term[] = [
  ...ja.map((text, i) => ({ id: `ja${i}`, text, lang: 'ja' as const })),
  ...en.map((text, i) => ({ id: `en${i}`, text, lang: 'en' as const })),
];
