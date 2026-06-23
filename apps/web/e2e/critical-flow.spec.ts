import { expect, test } from '@playwright/test';

/**
 * Critical path: register → create a link → see it listed → open its analytics.
 * Runs against a live stack (web + api + postgres + redis).
 */
test('register, create a link, and view its analytics', async ({ page }) => {
  const email = `e2e_${Date.now()}@example.com`;
  const password = 'password123';

  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Your links' })).toBeVisible();

  await page.getByLabel('Destination URL').fill('https://example.com/playwright');
  await page.getByRole('button', { name: 'Shorten' }).click();

  const row = page.getByTestId('link-row').first();
  await expect(row).toBeVisible();
  await expect(row).toContainText('https://example.com/playwright');

  await row.getByRole('link', { name: 'Analytics' }).click();
  await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]+$/);
  // CardTitle renders a <div>, so assert by text rather than heading role.
  await expect(page.getByText('Clicks over time')).toBeVisible();
  await expect(page.getByText('Total clicks')).toBeVisible();
});
