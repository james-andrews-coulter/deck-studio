import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('import, create list, export markdown', async ({ page }) => {
  await page.goto('/');
  // Decks tab is default (redirect from /)
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles('input[type=file]', path.join(__dirname, 'fixtures/sample.json'));

  // pre-mapped, navigates back; deck link visible on Decks screen
  await expect(page.getByRole('link', { name: /E2E Deck/ })).toBeVisible();

  // Create list
  await page.getByRole('link', { name: /^lists$/i }).click();
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('combobox').selectOption({ label: 'E2E Deck' });
  await page.getByPlaceholder(/shortlist/i).fill('Shortlist');
  await page.getByRole('button', { name: /^create$/i }).click();

  // List view shows cards (list name rendered as rename button, not a heading)
  await expect(page).toHaveURL(/\/lists\/[^/]+$/);
  await expect(page.getByRole('button', { name: 'Shortlist' })).toBeVisible();
  await expect(page.getByText('Alpha')).toBeVisible();

  // Export markdown (handle download)
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /list actions/i }).click();
  await page.getByRole('menuitem', { name: /export as markdown/i }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let body = '';
  if (stream) {
    for await (const chunk of stream) body += chunk.toString();
  }
  expect(body).toContain('# Shortlist');
  expect(body).toContain('- **Alpha**');
});
