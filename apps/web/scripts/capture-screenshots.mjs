// Capture README screenshots from a running stack. Run from apps/web:
//   node scripts/capture-screenshots.mjs
// Requires the demo data to be seeded (make seed) and the stack reachable at
// SHOT_BASE_URL (default http://localhost:3000).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const WEB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(WEB_DIR, '../../docs/screenshots');
const BASE = process.env.SHOT_BASE_URL ?? 'http://localhost:3000';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

await page.goto(`${BASE}/login`);
await page.getByLabel('Email').fill('demo@linklytics.dev');
await page.getByLabel('Password').fill('demopassword123');
await page.getByRole('button', { name: 'Log in' }).click();
await page.waitForURL(/\/dashboard$/);
await page.getByTestId('link-row').first().waitFor();
await page.screenshot({ path: path.join(OUT, 'dashboard.png'), fullPage: true });
console.log('saved dashboard.png');

await page.getByTestId('link-row').first().getByRole('link', { name: 'Analytics' }).click();
await page.getByText('Clicks over time').waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'analytics.png'), fullPage: true });
console.log('saved analytics.png');

await browser.close();
