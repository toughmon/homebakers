import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
test("baker growth journal, weekly challenge and accepted helpful answer", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const headers = { "x-requested-with": "oven-salon" };
  const helper = await browser.newContext({ baseURL: "http://127.0.0.1:5175" });
  let recipeId = "",
    postId = "",
    journalId = "";
  await page.setViewportSize({ width: 1440, height: 1000 });
  try {
    const unique = Date.now();
    for (const [client, name] of [
      [page.request, "기록 베이커"],
      [helper.request, "도움 베이커"],
    ] as const) {
      const signup = () =>
        client.post("/api/auth/register", {
          headers,
          data: {
            email: `growth-${name === "기록 베이커" ? "author" : "helper"}-${unique}@example.com`,
            name,
            password: "baking-password-123",
          },
        });
      let response = await signup();
      if (response.status() === 429) {
        await new Promise((resolve) => setTimeout(resolve, 61000));
        response = await signup();
      }
      expect(response.ok(), await response.text()).toBe(true);
    }
    const challenge = await (
      await page.request.get("/api/challenges/current")
    ).json();
    const recipe = {
      title: `성장 테스트 ${unique}`,
      description: "성장 테스트 레시피",
      image: "/images/madeleines.webp",
      category: challenge.category,
      difficulty: "쉬움",
      minutes: 30,
      servings: 4,
      ingredients: [{ name: "밀가루", amount: 100, unit: "g" }],
      steps: [{ title: "굽기", body: "180도에서 구워요", minutes: 15 }],
    };
    const created = await page.request.post("/api/recipes", {
      headers,
      data: recipe,
    });
    expect(created.status()).toBe(201);
    recipeId = (await created.json()).id;
    await page.goto("/#/account");
    await page
      .getByRole("link", { name: "나의 베이킹 성장 · 기록과 주간 도전 →" })
      .click();
    await expect(
      page.getByRole("heading", { name: "나의 베이킹 성장", exact: true }),
    ).toBeVisible();
    await page.getByLabel("레시피", { exact: true }).selectOption(recipeId);
    await page.getByLabel("결과와 배운 점").fill("촉촉한 완성, 다음엔 덜 달게");
    await page.getByLabel("재료·방법 변경").fill("설탕을 줄였어요");
    await page
      .getByLabel("완성 사진", { exact: true })
      .setInputFiles(resolve("apps/homebakers/public/images/madeleines.webp"));
    await expect(page.getByAltText("기록할 완성 사진")).toBeVisible();
    await page.getByRole("button", { name: "기록 저장", exact: true }).click();
    await expect(
      page.getByText("15 XP · 사진으로 기록한 레시피 1개"),
    ).toBeVisible();
    journalId = (
      await (await page.request.get("/api/baking-journal")).json()
    )[0].id;
    await page.locator(".badge.earned").first().scrollIntoViewIfNeeded();
    await page
      .locator('.badge.earned canvas[data-rendered="true"]')
      .first()
      .waitFor();
    await page
      .locator(".badge.earned")
      .getByRole("button", { name: "첫 완성 사진 금속 배지 크게 보기" })
      .click();
    const inspector = page.getByRole("dialog", {
      name: "첫 완성 사진 배지 상세",
    });
    await expect(inspector).toBeVisible();
    await inspector.locator('canvas[data-rendered="true"]').waitFor();
    const art = inspector.locator(".metal-badge-large");
    const before = await art.screenshot();
    const bounds = await art.boundingBox();
    if (!bounds) throw new Error("3D badge bounds missing");
    await page.mouse.move(
      bounds.x + bounds.width * 0.2,
      bounds.y + bounds.height * 0.5,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width * 0.7,
      bounds.y + bounds.height * 0.5,
      { steps: 12 },
    );
    await page.mouse.up();
    await expect
      .poll(async () => Number(await art.getAttribute("data-rotation")))
      .toBeGreaterThan(3);
    await inspector
      .getByRole("button", { name: "배지 오른쪽으로 90도 회전" })
      .click();
    await inspector
      .getByRole("button", { name: "배지 오른쪽으로 90도 회전" })
      .click();
    await expect
      .poll(async () => Number(await art.getAttribute("data-rotation")))
      .toBeGreaterThan(6);
    await inspector.getByRole("button", { name: "정면 보기" }).click();
    await expect(art).toHaveAttribute("data-rotation", "0.12");
    await inspector
      .getByRole("button", { name: "배지 왼쪽으로 90도 회전" })
      .click();
    await expect
      .poll(async () => !(await art.screenshot()).equals(before))
      .toBe(true);
    await inspector.getByRole("button", { name: "정면 보기" }).click();
    await inspector.screenshot({ path: "artifacts/metal-badge-detail.png" });
    await page.keyboard.press("Escape");
    await expect(inspector).not.toBeVisible();
    await page.screenshot({
      path: "artifacts/growth-desktop.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "도전 참여하기" }).click();
    await page.getByLabel("도전에 공개할 내 기록").selectOption(journalId);
    await page.getByRole("button", { name: "도전 기록 제출" }).click();
    await expect(page.getByText("✓ 도전 완료 · 30 XP")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Lv.2 홈베이커" }),
    ).toBeVisible();
    postId = (
      await (
        await page.request.post("/api/posts", {
          headers,
          data: {
            category: "질문",
            title: `성장 질문 ${unique}`,
            body: "어떻게 구워요?",
          },
        })
      ).json()
    ).id;
    await helper.request.post(`/api/posts/${postId}/comments`, {
      headers,
      data: { body: "온도를 조금 낮춰보세요" },
    });
    await page.goto(`/#/community/${postId}`);
    await page.getByRole("button", { name: "도움 됐어요 0" }).click();
    await expect(
      page.getByRole("button", { name: "도움 됐어요 1" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "답변 채택", exact: true }).click();
    await expect(page.getByText("✓ 채택된 답변")).toBeVisible();
    const helperPage = await helper.newPage();
    await helperPage.goto("/#/growth");
    await expect(
      helperPage.getByText("27 XP · 사진으로 기록한 레시피 0개"),
    ).toBeVisible();
    await page.getByRole("button", { name: "채택 취소" }).click();
    await page.getByRole("button", { name: "도움 됐어요 1" }).click();
    await helperPage.reload();
    await expect(
      helperPage.getByText("0 XP · 사진으로 기록한 레시피 0개"),
    ).toBeVisible();
    await page.goto("/#/growth");
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "삭제", exact: true }).click();
    await expect(
      page.getByText("0 XP · 사진으로 기록한 레시피 0개"),
    ).toBeVisible();
    journalId = "";
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "artifacts/growth-mobile.png",
      fullPage: true,
    });
  } finally {
    if (journalId)
      await page.request.delete(`/api/baking-journal/${journalId}`, {
        headers,
      });
    if (postId) await page.request.delete(`/api/posts/${postId}`, { headers });
    if (recipeId)
      await page.request.delete(`/api/recipes/${recipeId}`, { headers });
    await helper.close();
  }
});
