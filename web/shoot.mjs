import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'shots';
const BASE = process.env.BASE_URL || 'http://localhost:4173';
mkdirSync(OUT, { recursive: true });

const routes = [
  ['landing', '/'],
  ['login', '/login'],
  ['onboarding', '/onboarding'],
  ['family-dashboard', '/family-dashboard'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[${m.location().url}] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));

// Seed a session so authenticated routes render.
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /demo access/i }).click();
await page.waitForTimeout(2500);
console.log('after demo url:', page.url());

for (const [name, path] of routes) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log('shot', name);
}

// Moderator console — promote the demo account to moderator.
await page.evaluate(() => {
  const KEY = 'eap_web_auth_db';
  const db = JSON.parse(localStorage.getItem(KEY) || '{"users":[],"sessions":[]}');
  for (const u of db.users) u.role = 'moderator';
  localStorage.setItem(KEY, JSON.stringify(db));
});
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /demo access/i }).click();
await page.waitForTimeout(2000);
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/moderator.png`, fullPage: true });
console.log('shot moderator ->', page.url());

// Exercise the alert showcase + response drawer.
const showcase = page.getByRole('button', { name: /alert showcase/i });
if (await showcase.count()) {
  await showcase.click();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/moderator-alert.png`, fullPage: true });
  console.log('shot moderator-alert');

  // Open the response drawer from the alert feed.
  const alertCard = page.locator('button', { hasText: /Fall Sensor|Motion Tracker|Radar Unit/ }).first();
  if (await alertCard.count()) {
    await alertCard.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/moderator-drawer.png`, fullPage: true });
    console.log('shot moderator-drawer');
  }
}

// Exercise the family dashboard emergency flow.
await page.goto(`${BASE}/family-dashboard`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const fallBtn = page.getByRole('button', { name: /trigger fall test/i }).first();
if (await fallBtn.count()) {
  await fallBtn.click();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: `${OUT}/family-dispatch.png`, fullPage: true });
  console.log('shot family-dispatch');
}

console.log(errors.length ? '\n=== CONSOLE ERRORS ===\n' + errors.join('\n') : '\nno console errors');
await browser.close();
