import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the complete trip journey stays factual, safe, and accessible', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/');
  await page
    .locator('.hero')
    .getByRole('link', { name: 'Start a group drive', exact: true })
    .click();
  await expect(page).toHaveURL('/trip/new');
  await expect(
    page.getByRole('heading', { name: /set up the hà nội.*hạ long drive/i }),
  ).toBeVisible();

  const consent = page.getByRole('checkbox', { name: /share location for anh huy/i });
  const start = page.getByRole('button', { name: /start trip/i });
  await consent.uncheck();
  await expect(start).toBeDisabled();
  await consent.check();
  await expect(start).toBeEnabled();
  await start.click();

  await expect(page).toHaveURL('/trips/TRIP001/live');
  const next = page.getByRole('button', { name: /next frame/i });
  await next.click();
  await expect(
    page
      .getByRole('region', { name: /shared route/i })
      .getByText(/location confidence is degraded/i),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /convoy split/i })).toHaveCount(0);

  for (let index = 0; index < 7; index += 1) await next.click();
  const inspector = page.getByRole('complementary', { name: /trip inspector/i });
  await expect(inspector.getByRole('heading', { name: /convoy split/i })).toBeVisible();
  await expect(inspector.getByText(/^900 m$/)).toBeVisible();
  await expect(inspector.getByRole('listitem', { name: /notification for/i })).toHaveCount(4);

  await inspector.getByRole('button', { name: /review regroup points/i }).click();
  const regroup = inspector.getByRole('region', { name: /regroup points/i });
  await expect(regroup.getByRole('listitem', { name: /highway shoulder km62/i })).toContainText(
    /unsafe stop.*insufficient convoy parking/i,
  );
  await regroup.getByRole('button', { name: /approve minh châu rest stop/i }).click();
  await expect(inspector.getByRole('heading', { name: /regroup approved/i })).toBeVisible();

  for (let index = 0; index < 6; index += 1) await next.click();
  await expect(page).toHaveURL('/trips/TRIP001/summary');
  await expect(page.getByRole('heading', { name: /the convoy is together again/i })).toBeVisible();
  await expect(page.getByText(/1 confirmed · 1 resolved/i)).toBeVisible();
  await expect(page.getByText(/^900 m$/)).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const seriousViolations = results.violations.filter((violation) =>
    ['serious', 'critical'].includes(violation.impact ?? ''),
  );
  expect(seriousViolations).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test('compact live controls stay inside a 320px viewport', async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 320 });
  await page.goto('/trip/new');
  await page.getByRole('button', { name: /start trip/i }).click();
  await expect(page).toHaveURL('/trips/TRIP001/live');
  await expect(page.getByRole('group', { name: /replay controls/i })).toBeVisible();

  const layout = await page.evaluate(() => {
    const controls = document.querySelector('.replay-controls');
    const rect = controls?.getBoundingClientRect();
    return {
      controlsLeft: rect?.left ?? -1,
      controlsRight: rect?.right ?? Number.POSITIVE_INFINITY,
      contentWidth: document.documentElement.scrollWidth,
      offenders: Array.from(document.querySelectorAll('body *'))
        .map((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            className: typeof element.className === 'string' ? element.className : '',
            left: bounds.left,
            right: bounds.right,
            tagName: element.tagName,
          };
        })
        .filter(
          (element) =>
            element.left < 0 ||
            (element.right > document.documentElement.clientWidth &&
              element.right <= document.documentElement.scrollWidth + 1),
        )
        .sort((left, right) => left.right - right.right)
        .slice(0, 20),
      viewportWidth: document.documentElement.clientWidth,
    };
  });

  expect(layout.contentWidth, JSON.stringify(layout.offenders)).toBeLessThanOrEqual(
    layout.viewportWidth,
  );
  expect(layout.controlsLeft).toBeGreaterThanOrEqual(0);
  expect(layout.controlsRight).toBeLessThanOrEqual(layout.viewportWidth);
});
