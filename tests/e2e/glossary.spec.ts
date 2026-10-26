import { test, expect } from "@playwright/test";

test("baking glossary search and category filter", async ({ page }) => {
  await page.goto("/#/glossary");
  await expect(
    page.getByRole("heading", { name: "베이킹 용어 사전" }),
  ).toBeVisible();
  const search = page.getByLabel("베이킹 용어 검색");

  await search.fill("오토리즈");
  await expect(page.getByRole("heading", { name: "오토리즈" })).toBeVisible();
  await expect(page.locator(".glossary-item")).toHaveCount(1);

  await search.fill("meringue");
  await expect(page.getByRole("heading", { name: "머랭" })).toBeVisible();

  await search.fill("르방");
  await expect(page.getByRole("heading", { name: "천연발효종" })).toBeVisible();

  await search.fill("");
  await page.getByRole("button", { name: "도구", exact: true }).click();
  await expect(page.getByRole("heading", { name: "스크래퍼" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "머랭" })).toHaveCount(0);

  await search.fill("존재하지않는용어");
  await expect(page.getByText("일치하는 용어가 없어요")).toBeVisible();
  await page.getByRole("button", { name: "검색 초기화" }).click();
  await expect(search).toHaveValue("");
});
