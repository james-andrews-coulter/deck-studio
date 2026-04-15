// CAPTURE=1 npx playwright test _banner --project=chromium

import { test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENS = path.join(__dirname, '..', '..', 'docs', 'screenshots');
const OUT = path.join(__dirname, '..', '..', 'docs', 'banner.png');

// page.setContent runs on about:blank, which blocks file:// image loads.
// Inlining the PNGs as data URLs keeps them same-origin.
const dataUrl = (p: string) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;

test.skip(!process.env.CAPTURE, 'dev-only asset generation; set CAPTURE=1');

test('render banner', async ({ browser }) => {
  test.setTimeout(30_000);

  const decks = dataUrl(path.join(SCREENS, '02-decks-populated.png'));
  const list = dataUrl(path.join(SCREENS, '04-list-folders.png'));
  const swipe = dataUrl(path.join(SCREENS, '06-swipe-mode.png'));

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1600px; height: 720px; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  body {
    width: 1600px; height: 720px;
    background: radial-gradient(1200px 600px at 20% 10%, #fef6ff 0%, #fafcff 40%, #f1f5fb 100%);
    position: relative;
    overflow: hidden;
  }
  .wordmark { position: absolute; left: 72px; top: 88px; color: #0f172a; }
  .wordmark .name { font-size: 64px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
  .wordmark .tag  { font-size: 22px; font-weight: 500; color: #475569; margin-top: 20px; max-width: 420px; line-height: 1.4; }
  .chips { margin-top: 28px; display: flex; gap: 8px; flex-wrap: wrap; }
  .chip  {
    font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
    color: #334155; background: #ffffffcc; border: 1px solid #e2e8f0; border-radius: 999px;
    padding: 6px 12px;
  }
  .stage {
    position: absolute; right: 60px; top: 50%; transform: translateY(-50%);
    display: flex; gap: 28px; align-items: center;
  }
  /* Phone aspect tuned to iPhone 13 viewport (390 x 844). */
  .phone {
    width: 252px; height: 548px;
    background: #0f172a;
    border-radius: 38px;
    padding: 8px;
    box-shadow:
      0 22px 42px rgba(15, 23, 42, 0.18),
      0 6px 14px rgba(15, 23, 42, 0.12),
      inset 0 0 0 2px #1e293b;
  }
  .phone .screen { width: 100%; height: 100%; border-radius: 30px; background: #ffffff; overflow: hidden; }
  .phone img { width: 100%; height: 100%; object-fit: contain; object-position: top center; background: #ffffff; display: block; }
  .phone.tilt-left  { transform: rotate(-5deg) translateY(6px); }
  .phone.tilt-right { transform: rotate(5deg)  translateY(6px); }
  .phone.center     { transform: translateY(-8px); z-index: 2; }
  .blob {
    position: absolute; inset: auto auto 0 0;
    width: 700px; height: 500px;
    background: radial-gradient(closest-side, #bae6fd88 0%, transparent 70%);
    filter: blur(8px);
    pointer-events: none;
  }
  .blob2 {
    position: absolute; top: -180px; right: -100px;
    width: 600px; height: 500px;
    background: radial-gradient(closest-side, #e9d5ff66 0%, transparent 70%);
    filter: blur(14px);
    pointer-events: none;
  }
</style></head>
<body>
  <div class="blob"></div>
  <div class="blob2"></div>
  <div class="wordmark">
    <div class="name">Deck Studio</div>
    <div class="tag">Mobile-first card-sorting. Import a deck, triage with a swipe, send the keepers anywhere.</div>
    <div class="chips">
      <span class="chip">Local-only</span>
      <span class="chip">PWA</span>
      <span class="chip">Open source</span>
    </div>
  </div>
  <div class="stage">
    <div class="phone tilt-left"><div class="screen"><img src="${decks}" alt="Decks"/></div></div>
    <div class="phone center"><div class="screen"><img src="${list}" alt="List"/></div></div>
    <div class="phone tilt-right"><div class="screen"><img src="${swipe}" alt="Swipe"/></div></div>
  </div>
</body></html>`;

  const context = await browser.newContext({
    viewport: { width: 1600, height: 720 },
    deviceScaleFactor: 2,
  });
  try {
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path: OUT, type: 'png', fullPage: false });
  } finally {
    await context.close();
  }
});
