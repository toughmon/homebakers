import { test, expect } from "@playwright/test";

test("badge progress, acquisition alert and persistent profile badge", async ({
  page,
}) => {
  const unique = Date.now();
  await page.goto("/#/login");
  await page.getByRole("button", { name: "처음 오셨나요? 회원가입" }).click();
  await page.getByLabel("닉네임").fill(`배지${unique}`);
  await page
    .getByLabel("이메일", { exact: true })
    .fill(`badge-${unique}@example.com`);
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill("Badge-e2e-password-2026");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `배지${unique} 님의 오븐` }),
  ).toBeVisible();
  await page.goto("/#/growth");
  const first = page
    .locator("article.badge")
    .filter({ has: page.locator("strong", { hasText: "첫 완성 사진" }) });
  await expect(first.getByRole("progressbar")).toHaveAttribute("value", "0");
  await expect(
    first.getByRole("button", { name: "대표 배지로 선택" }),
  ).toHaveCount(0);
  const recipes = await (await page.request.get("/api/recipes")).json();
  const recipe = recipes[0];
  const headers = { "x-requested-with": "oven-salon" };
  const journal = await page.request.post("/api/baking-journal", {
    headers,
    data: {
      recipeId: recipe.id,
      bakedOn: new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10),
      body: "사진과 함께 첫 기록",
      changes: "",
      outcome: "성공",
      image: "/images/madeleines.webp",
    },
  });
  expect(journal.ok()).toBe(true);
  const journalId = (await journal.json()).id;
  await page.reload();
  await expect(
    page.getByRole("status", { name: "배지 획득 알림" }),
  ).toBeVisible();
  await expect(first.getByRole("progressbar")).toHaveAttribute("value", "1");
  await first.getByRole("button", { name: "대표 배지로 선택" }).click();
  await expect(
    first.getByRole("button", { name: "✓ 대표 배지 · 해제" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "배지 획득 알림 닫기" }).click();
  await expect(
    page.getByRole("status", { name: "배지 획득 알림" }),
  ).toHaveCount(0);
  await page.goto("/#/account");
  await expect(
    page
      .locator(".profile-featured-badge")
      .getByText("첫 완성 사진", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator(".profile-featured-badge")
      .getByText("첫 완성 사진", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "배지 획득 알림" }),
  ).toHaveCount(0);
  await page.goto("/#/notifications");
  await expect(
    page.getByText("새 배지를 획득했어요!", { exact: true }),
  ).toBeVisible();
  expect(
    (
      await page.request.delete(`/api/baking-journal/${journalId}`, { headers })
    ).ok(),
  ).toBe(true);
  await page.goto("/#/account");
  await expect(
    page
      .locator(".profile-featured-badge")
      .getByText("획득한 배지로 프로필을 꾸며보세요 →"),
  ).toBeVisible();
});
