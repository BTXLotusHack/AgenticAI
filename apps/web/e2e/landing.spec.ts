import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const requiredWidths = [320, 360, 390, 768, 1024, 1280, 1440] as const;

test('landing journey is navigable, accessible, and free of console errors', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /every car\. one journey\./i }),
  ).toBeVisible();

  await page.locator('footer').getByRole('link', { name: /how it works/i }).click();
  await expect(page.locator('#how-it-works')).toBeInViewport();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const seriousViolations = results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );

  expect(seriousViolations).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('all required responsive widths avoid horizontal overflow', async ({ page }) => {
  for (const width of requiredWidths) {
    await page.setViewportSize({ height: 900, width });
    await page.goto('/');
    const sizes = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(sizes.content, `content width at ${width}px`).toBeLessThanOrEqual(
      sizes.viewport,
    );
  }
});

test('mobile navigation opens, links to sections, and closes', async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto('/');

  const menuButton = page.getByRole('button', { name: /open menu/i });
  await menuButton.click();
  await expect(
    page.getByRole('dialog', { name: /mobile navigation/i }),
  ).toBeVisible();

  await page
    .getByRole('dialog', { name: /mobile navigation/i })
    .getByRole('link', { name: /safety/i })
    .click();
  await expect(page.locator('#safety')).toBeInViewport();
  await expect(
    page.getByRole('dialog', { name: /mobile navigation/i }),
  ).not.toBeVisible();
});

test('convoy controls expose distinct safe messages for the separated state', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /gap detected/i }).click();

  await expect(
    page.locator('.story-status').getByText(/cars 4 and 5 are behind/i),
  ).toBeVisible();
  await expect(
    page.getByText(/continue safely to the shared regroup point/i),
  ).toBeVisible();
  await expect(page.getByText(/car 3.*car 4 boundary.*gap detected/i)).toBeVisible();

  const geometry = await page.evaluate(() => {
    const caption = document.querySelector('.route-stage__boundary > span:last-child');
    const node = document.querySelector('[aria-label="Car 3 vehicle node"]');
    const captionRect = caption?.getBoundingClientRect();
    const nodeRect = node?.getBoundingClientRect();
    return {
      captionBottom: captionRect?.bottom ?? Number.POSITIVE_INFINITY,
      nodeTop: nodeRect?.top ?? Number.NEGATIVE_INFINITY,
    };
  });
  expect(geometry.captionBottom).toBeLessThan(geometry.nodeTop);
});

test('reduced motion preserves the complete story without sustained animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');

  const storyHeading = page.locator('#how-it-works h2');
  await expect(storyHeading).toBeVisible();
  await expect(storyHeading).toContainText(/loopin understands the whole group/i);
  await page.getByRole('button', { name: /gap detected/i }).click();
  await expect(
    page.locator('.story-status').getByText(/cars 4 and 5 are behind/i),
  ).toBeVisible();

  const reducedDuration = await page
    .locator('.hero__scroll-line')
    .evaluate((element) => getComputedStyle(element, '::after').animationDuration);
  expect(Number.parseFloat(reducedDuration)).toBeLessThanOrEqual(0.01);
});
