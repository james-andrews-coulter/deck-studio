// CAPTURE=1 npx playwright test _screenshots --project=mobile

import { test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIRST_IMPORT_SHOWN_KEY } from '../../src/lib/firstRun';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_DECK = path.join(__dirname, '..', '..', 'public', 'sample-deck.json');
const OUT = path.join(__dirname, '..', '..', 'docs', 'screenshots');

// Sonner's default toast duration; waiting past it guarantees a clear frame.
const TOAST_CLEAR_MS = 4500;

test.describe('screenshots', () => {
  test.skip(!process.env.CAPTURE, 'dev-only asset generation; set CAPTURE=1');

  test('capture key screens (mobile)', async ({ page }) => {
    test.setTimeout(60_000);

    await page.addInitScript((key) => {
      try {
        localStorage.setItem(key, '1');
      } catch {}
    }, FIRST_IMPORT_SHOWN_KEY);

    await page.goto('/');
    await page.screenshot({ path: path.join(OUT, '01-decks-empty.png'), fullPage: false });

    await page.getByRole('button', { name: /import deck/i }).click();
    await page.setInputFiles('input[type=file]', SAMPLE_DECK);

    await page.getByRole('button', { name: /school of life/i }).waitFor();
    await page.waitForTimeout(TOAST_CLEAR_MS);
    await page.screenshot({ path: path.join(OUT, '02-decks-populated.png') });

    await page.getByRole('button', { name: /open navigation/i }).click();
    await page.getByRole('link', { name: /^lists$/i }).click();
    await page.waitForURL(/\/lists$/);
    await page.screenshot({ path: path.join(OUT, '03-lists-empty.png') });

    await page.getByRole('button', { name: /new list/i }).click();
    await page
      .getByRole('combobox')
      .first()
      .selectOption({ label: 'The School of Life: What Do You Really Want?' });
    const exerciseSelects = page.getByRole('combobox');
    if ((await exerciseSelects.count()) > 1) {
      await exerciseSelects.nth(1).selectOption({ label: 'Priority Planner' }).catch(() => {});
    }
    await page.getByPlaceholder(/shortlist|list name|name/i).fill('What Do I Really Want?');
    await page.getByRole('button', { name: /^create$/i }).click();

    await page.waitForURL(/\/lists\/[^/]+$/);
    await page.waitForTimeout(TOAST_CLEAR_MS);
    await page.screenshot({ path: path.join(OUT, '04-list-folders.png') });

    const thisWeek = page.getByRole('button', { name: /this week/i }).first();
    if (await thisWeek.count()) {
      await thisWeek.click();
      await page.waitForURL(/folder=/);
      await page.screenshot({ path: path.join(OUT, '05-folder-subview.png') });
      await page.getByRole('button', { name: /back to list/i }).click();
      await page.waitForURL(/\/lists\/[^/]+$/);
    }

    await page.getByRole('button', { name: /^swipe$/i }).click();
    await page.waitForURL(/mode=swipe/);
    await page.screenshot({ path: path.join(OUT, '06-swipe-mode.png') });

    await page.getByRole('button', { name: /^list$/i }).click();
    await page.waitForURL(/mode=view|^(?!.*mode=swipe)/);

    await page.getByRole('button', { name: /open navigation/i }).click();
    await page.locator('[data-state="open"]').first().waitFor();
    await page.screenshot({ path: path.join(OUT, '07-nav-drawer.png') });
  });
});
