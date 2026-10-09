// Records the in-game trailer (video + game audio) to a .webm file.
//
//   node scripts/record-trailer.mjs [url] [out]
//
// Opens a real Chrome window, auto-accepts "share this tab", starts recording the tab with
// MediaRecorder, resizes the window so the page is exactly 1280×720 (the sharing bar takes some
// height), then plays the trailer until it ends.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5173/?trailer';
const out = process.argv[3] ?? 'media/trailer.webm';
const W = 1280;
const H = 720;
const DURATION_MS = 81_500;

const browser = await chromium.launch({
  channel: 'chrome',
  headless: false,
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--auto-accept-this-tab-capture', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', `--window-size=${W},${H + 200}`],
});
const context = await browser.newContext({ viewport: null, acceptDownloads: true });
const page = await context.newPage();
await page.goto(url);
await page.waitForSelector('.tr-start');

// Hide the play button while we set up, and expose a recorder that starts on a trusted click.
await page.evaluate(() => {
  const btn = document.querySelector('.tr-start');
  btn.style.opacity = '0';
  const rec = document.createElement('button');
  rec.id = '__rec';
  rec.style.cssText = 'position:fixed;left:0;top:0;width:4px;height:4px;opacity:0;z-index:99999';
  document.body.append(rec);
  rec.addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30, cursor: 'never' },
      audio: true,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
    });
    const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 8_000_000 });
    const chunks = [];
    mr.ondataavailable = (e) => chunks.push(e.data);
    mr.start(1000);
    window.__stopRecording = () =>
      new Promise((resolve) => {
        mr.onstop = () => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
          a.download = 'trailer.webm';
          document.body.append(a);
          a.click();
          resolve(chunks.length);
        };
        mr.stop();
        for (const t of stream.getTracks()) t.stop();
      });
  });
});

await page.click('#__rec');
await page.waitForTimeout(1200); // let the sharing bar appear

// Resize the window so the page content is exactly W×H.
const cdp = await context.newCDPSession(page);
const { windowId } = await cdp.send('Browser.getWindowForTarget');
for (let i = 0; i < 4; i++) {
  const [iw, ih] = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
  if (iw === W && ih === H) break;
  const { bounds } = await cdp.send('Browser.getWindowBounds', { windowId });
  await cdp.send('Browser.setWindowBounds', { windowId, bounds: { width: bounds.width + (W - iw), height: bounds.height + (H - ih) } });
  await page.waitForTimeout(400);
}
console.log('page size', await page.evaluate(() => [window.innerWidth, window.innerHeight]));

await page.click('.tr-start'); // still invisible, so it never shows up in the video
console.log(`recording ${DURATION_MS / 1000}s…`);
await page.waitForTimeout(DURATION_MS);

const download = page.waitForEvent('download');
await page.evaluate(() => window.__stopRecording());
mkdirSync(dirname(out), { recursive: true });
await (await download).saveAs(out);
console.log(`saved ${out}`);
await browser.close();
