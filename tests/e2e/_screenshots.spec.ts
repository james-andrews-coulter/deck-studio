// Run with: npx playwright test _screenshots --project=mobile
// Produces mobile screenshots used by README.md and the banner.

import { test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_DECK = path.join(__dirname, '..', '..', 'public', 'sample-deck.json');
const OUT = path.join(__dirname, '..', '..', 'docs', 'screenshots');

// Sonner default toast duration. We wait a bit past it to guarantee a clear frame.
const TOAST_CLEAR_MS = 4500;

test.describe('screenshots', () => {
  test('capture key screens (mobile)', async ({ page }) => {
    test.setTimeout(60_000);

    // Suppress the first-import tip toast by pre-setting the flag.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('deck-studio:firstImportShown', '1');
      } catch {}
    });

    await page.goto('/');

    // Decks screen — empty state.
    await page.screenshot({ path: path.join(OUT, '01-decks-empty.png'), fullPage: false });

    // Import the real sample deck (140 cards, six exercises).
    await page.getByRole('button', { name: /import deck/i }).click();
    await page.setInputFiles('input[type=file]', SAMPLE_DECK);

    await page.getByRole('button', { name: /school of life/i }).waitFor();
    await page.waitForTimeout(TOAST_CLEAR_MS);
    await page.screenshot({ path: path.join(OUT, '02-decks-populated.png') });

    // Lists screen — empty.
    await page.getByRole('button', { name: /open navigation/i }).click();
    await page.getByRole('link', { name: /^lists$/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '03-lists-empty.png') });

    // Create a list using the Priority Planner exercise.
    await page.getByRole('button', { name: /new list/i }).click();
    await page
      .getByRole('combobox')
      .first()
      .selectOption({ label: 'The School of Life: What Do You Really Want?' });
    const exerciseSelects = page.getByRole('combobox');
    if (await exerciseSelects.count() > 1) {
      await exerciseSelects.nth(1).selectOption({ label: 'Priority Planner' }).catch(() => {});
    }
    await page.getByPlaceholder(/shortlist|list name|name/i).fill('What Do I Really Want?');
    await page.getByRole('button', { name: /^create$/i }).click();

    // List view with folders + cards.
    await page.waitForURL(/\/lists\/[^/]+$/);
    await page.waitForTimeout(TOAST_CLEAR_MS);
    await page.screenshot({ path: path.join(OUT, '04-list-folders.png') });

    // Open a folder (sub-view) — folder tile text is uppercase.
    const thisWeek = page.getByRole('button', { name: /this week/i }).first();
    if (await thisWeek.count()) {
      await thisWeek.click();
      await page.waitForURL(/folder=/);
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUT, '05-folder-subview.png') });
      await page.getByRole('button', { name: /back to list/i }).click();
      await page.waitForTimeout(300);
    }

    // Swipe mode.
    await page.getByRole('button', { name: /^swipe$/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, '06-swipe-mode.png') });

    // Back to list.
    await page.getByRole('button', { name: /^list$/i }).click();
    await page.waitForTimeout(300);

    // Nav drawer open.
    await page.getByRole('button', { name: /open navigation/i }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, '07-nav-drawer.png') });
  });
});
