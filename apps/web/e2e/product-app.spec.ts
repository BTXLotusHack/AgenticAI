import { expect, test } from '@playwright/test';

test('product routes render without mobile app-nav overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/settings');

  await expect(page.getByRole('heading', { name: 'Settings.' })).toBeVisible();
  const overflow = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth > window.innerWidth + 1,
    nav: (() => {
      const nav = document.querySelector('.product-mobile-nav');
      return nav ? nav.scrollWidth > nav.clientWidth + 1 : true;
    })(),
  }));

  expect(overflow).toEqual({ page: false, nav: false });
});

test('fixture auth validation updates visible form state', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Log in to Loopin' })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  await expect(page.getByText('Email is required.')).toBeVisible();
  await expect(page.getByText('Password is required.')).toBeVisible();
});
