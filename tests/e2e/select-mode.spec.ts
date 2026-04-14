import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('select mode: bulk-create a group from checked cards', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles('input[type=file]', path.join(__dirname, 'fixtures/sample.json'));

  await page.getByRole('button', { name: /open navigation/i }).click(); await page.getByRole('link', { name: /^lists$/i }).click();
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('combobox').selectOption({ label: 'E2E Deck' });
  await page.getByPlaceholder(/shortlist/i).fill('Grouped');
  await page.getByRole('button', { name: /^create$/i }).click();

  // Enter Select mode
  await page.getByRole('button', { name: /^select$/i }).click();
  // Select button flips to Done
  await expect(page.getByRole('button', { name: /^done$/i })).toBeVisible();

  // Check 2 cards — Alpha and Beta
  await page.getByRole('checkbox', { name: /select card 1/i }).check();
  await page.getByRole('checkbox', { name: /select card 2/i }).check();

  // Floating action bar shows a "New group" button
  await expect(page.getByRole('button', { name: /^new group$/i })).toBeVisible();
  await page.getByRole('button', { name: /^new group$/i }).click();

  // Dialog prompts for the group name
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('textbox', { name: /group name/i }).fill('Warm-ups');
  await page.getByRole('button', { name: /create group/i }).click();

  // Folder tile for the new group renders (uppercase label). The tap target
  // is the content button; a separate drag-grip button sits next to it, so
  // match exactly by name.
  const tile = page.getByRole('button', { name: 'Warm-ups', exact: true });
  await expect(tile).toBeVisible();
  await tile.click();
  await expect(page.getByRole('heading', { name: /warm-ups/i })).toBeVisible();
  await expect(page.getByText('Alpha')).toBeVisible();
  await expect(page.getByText('Beta')).toBeVisible();
});
