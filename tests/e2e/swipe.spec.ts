import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('swipe session discards one and updates hidden counter', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles('input[type=file]', path.join(__dirname, 'fixtures/sample.json'));

  await page.getByRole('link', { name: /^lists$/i }).click();
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('combobox').selectOption({ label: 'E2E Deck' });
  await page.getByPlaceholder(/shortlist/i).fill('Review');
  await page.getByRole('button', { name: /^create$/i }).click();

  // Switch to swipe mode
  await page.getByRole('button', { name: /^swipe$/i }).click();
  // Alpha card visible, click Discard (swipe left)
  await page.getByRole('button', { name: /^discard$/i }).click();
  // Beta card — Keep
  await page.getByRole('button', { name: /^keep$/i }).click();
  // Gamma — Keep
  await page.getByRole('button', { name: /^keep$/i }).click();

  // Summary screen
  await expect(page.getByRole('heading', { name: /all done/i })).toBeVisible();
  await page.getByRole('button', { name: /back to list/i }).click();

  // Hidden counter should show 1 hidden (Alpha discarded)
  await expect(page.getByText(/1 hidden/i)).toBeVisible();
});
