import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('exercise guide opens from nav drawer while in swipe mode', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles(
    'input[type=file]',
    path.join(__dirname, 'fixtures/sample-with-exercises.json'),
  );

  await page.getByRole('button', { name: /open navigation/i }).click();
  await page.getByRole('link', { name: /^lists$/i }).click();
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('combobox', { name: /deck/i }).selectOption({ label: 'E2E Exercise Deck' });
  await page.getByRole('combobox', { name: /exercise/i }).selectOption({ label: 'Triage' });
  await page.getByRole('button', { name: /^create$/i }).click();

  // Switch to swipe mode.
  await page.getByRole('button', { name: /^swipe$/i }).click();
  await expect(page).toHaveURL(/mode=swipe/);

  // Guide is now accessed from the list menu (not the nav drawer).
  await page.getByRole('button', { name: /list actions/i }).click();
  await page.getByRole('menuitem', { name: /view guide/i }).click();

  // Guide sheet should open with instructions + template.
  await expect(page.getByText(/keep or park each card/i)).toBeVisible();
});
