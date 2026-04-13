import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('deck rename: tap deck row, inline-rename via sheet title', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles('input[type=file]', path.join(__dirname, 'fixtures/sample.json'));

  // Deck row is visible in the Decks list
  const deckRow = page.getByRole('button', { name: /E2E Deck/ });
  await expect(deckRow).toBeVisible();
  await deckRow.click();

  // Sheet opens; the title is a button (from InlineRenameHeading)
  const titleButton = page.getByRole('button', { name: 'E2E Deck' });
  await expect(titleButton).toBeVisible();
  await titleButton.click();

  // Input takes over; clear and type the new name. Press Enter via the
  // focused element since fill() changes the value and would invalidate a
  // value-based locator.
  const input = page.locator('input[value="E2E Deck"]');
  await expect(input).toBeVisible();
  await input.fill('Renamed Deck');
  await page.keyboard.press('Enter');

  // Sheet title updates to the new name (still an editable button)
  await expect(page.getByRole('button', { name: 'Renamed Deck' })).toBeVisible();

  // Close the sheet (press Escape), then verify the list row now shows the new name
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Renamed Deck/ })).toBeVisible();
});
