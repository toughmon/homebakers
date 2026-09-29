import { expect, test } from "@playwright/test";

test("sourdough hero renders moving WebGL steam without overflow", async ({
  page,
}) => {
  await page.goto("/");
  const hero = page.locator(".hero");
  await expect(
    hero.locator('.hero-steam canvas[data-rendered="true"]'),
  ).toBeVisible();
  await expect(hero.locator(".hero-image")).toHaveCSS(
    "background-image",
    /hero-sourdough\.webp/,
  );
  const first = await hero.locator(".hero-steam canvas").screenshot();
  await page.waitForTimeout(350);
  const second = await hero.locator(".hero-steam canvas").screenshot();
  expect(second.equals(first)).toBe(false);
  await hero.screenshot({ path: "artifacts/sourdough-steam-hero.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    hero.locator('.hero-steam canvas[data-rendered="true"]'),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
