import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('exercise picker seeds groups and companion opens', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles(
    'input[type=file]',
    path.join(__dirname, 'fixtures/sample-with-exercises.json'),
  );

  await expect(page.getByRole('button', { name: /E2E Exercise Deck/ })).toBeVisible();

  await page.getByRole('button', { name: /open navigation/i }).click(); await page.getByRole('link', { name: /^lists$/i }).click();
  await page.getByRole('button', { name: /new list/i }).click();

  await page
    .getByRole('combobox', { name: /deck/i })
    .selectOption({ label: 'E2E Exercise Deck' });

  await page
    .getByRole('combobox', { name: /exercise/i })
    .selectOption({ label: 'Triage' });

  await expect(page.getByPlaceholder(/shortlist/i)).toHaveValue('Triage');

  await page.getByRole('button', { name: /^create$/i }).click();
  await expect(page).toHaveURL(/\/lists\/[^/]+$/);

  await expect(page.getByRole('button', { name: 'Keep', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Park', exact: true })).toBeVisible();

  // The exercise guide opens from the list menu on a list with a bound exercise.
  await page.getByRole('button', { name: /list actions/i }).click();
  await page.getByRole('menuitem', { name: /view guide/i }).click();
  await expect(page.getByText(/keep or park each card/i)).toBeVisible();
});

test('None option gives a list with no guide entry in the list menu', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles(
    'input[type=file]',
    path.join(__dirname, 'fixtures/sample-with-exercises.json'),
  );

  await page.getByRole('button', { name: /open navigation/i }).click(); await page.getByRole('link', { name: /^lists$/i }).click();
  await page.getByRole('button', { name: /new list/i }).click();
  await page
    .getByRole('combobox', { name: /deck/i })
    .selectOption({ label: 'E2E Exercise Deck' });
  await page.getByPlaceholder(/shortlist/i).fill('Plain List');
  await page.getByRole('button', { name: /^create$/i }).click();

  await expect(page).toHaveURL(/\/lists\/[^/]+$/);
  await page.getByRole('button', { name: /list actions/i }).click();
  await expect(page.getByRole('menuitem', { name: /view guide/i })).toHaveCount(0);
});
