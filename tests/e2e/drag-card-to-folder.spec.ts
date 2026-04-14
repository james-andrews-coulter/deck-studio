import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('dragging a card from the Cards panel onto a folder nests it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /import deck/i }).click();
  await page.setInputFiles(
    'input[type=file]',
    path.join(__dirname, 'fixtures/sample.json'),
  );

  // Get to a fresh list
  await page.getByRole('button', { name: /open navigation/i }).click();
  await page.getByRole('link', { name: /^lists$/i }).click();
  await page.getByRole('button', { name: /new list/i }).click();
  await page.getByRole('combobox').selectOption({ label: 'E2E Deck' });
  await page.getByPlaceholder(/shortlist/i).fill('Nesting');
  await page.getByRole('button', { name: /^create$/i }).click();

  // Create a folder via Select mode (New group button requires 2+ selections).
  await page.getByRole('button', { name: /^select$/i }).click();
  await page.getByRole('checkbox', { name: /select card 1/i }).check();
  await page.getByRole('checkbox', { name: /select card 3/i }).check();
  await page.getByRole('button', { name: /^new folder$/i }).click();
  await page.getByRole('textbox', { name: /group name/i }).fill('Bin');
  await page.getByRole('button', { name: /create group/i }).click();

  // Drag Beta (still ungrouped) onto the Bin folder tile.
  const betaRow = page.locator('li', { has: page.getByText('Beta', { exact: true }) });
  await expect(betaRow).toBeVisible();

  // Use pointer-based drag: hover on the Beta row's grip, press, move, release onto the Bin tile.
  const grip = betaRow.getByRole('button', { name: /drag to reorder/i });
  const binTile = page.getByRole('button', { name: 'Bin', exact: true });
  await expect(binTile).toBeVisible();

  const gripBox = await grip.boundingBox();
  const tileBox = await binTile.boundingBox();
  if (!gripBox || !tileBox) throw new Error('Could not measure drag targets');

  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  // Move in small steps to exceed PointerSensor distance activation (5px).
  await page.mouse.move(gripBox.x + 20, gripBox.y + 20, { steps: 5 });
  await page.mouse.move(tileBox.x + tileBox.width / 2, tileBox.y + tileBox.height / 2, { steps: 10 });
  await page.mouse.up();

  // Beta leaving the ungrouped panel proves the drop landed — it could only
  // have moved into a folder since that's the only drop target we're over.
  await expect(betaRow).toHaveCount(0);
});
