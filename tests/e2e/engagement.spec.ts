import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

test("discover, follow, like, bake review, shopping and new recipe notification", async ({
  page,
  browser,
}) => {
  const unique = Date.now();
  const authorContext = await browser.newContext({
    baseURL: "http://127.0.0.1:5175",
  });
  let recipeId = "",
    nextRecipeId = "",
    postId = "",
    shoppingId = "";
  try {
    const author = await authorContext.request.post("/api/auth/register", {
      headers: { "x-requested-with": "oven-salon" },
      data: {
        email: `author-${unique}@example.com`,
        password: "baking-password-123",
        name: "테스트 작성자",
      },
    });
    expect(author.ok()).toBe(true);
    const follower = await page.request.post("/api/auth/register", {
      headers: { "x-requested-with": "oven-salon" },
      data: {
        email: `follower-${unique}@example.com`,
        password: "baking-password-123",
        name: "테스트 팔로워",
      },
    });
    expect(follower.ok()).toBe(true);
    const recipe = {
      title: `아몬드 테스트 휘낭시에 ${unique}`,
      description: "직접 구워보는 테스트 레시피입니다.",
      image: "/images/madeleines.webp",
      category: "구움과자",
      difficulty: "쉬움",
      minutes: 30,
      servings: 4,
      ingredients: [{ name: "아몬드가루", amount: 100, unit: "g" }],
      steps: [
        {
          title: "반죽하고 굽기",
          body: "180°C에서 15분 굽습니다.",
          minutes: 15,
        },
      ],
    };
    const created = await authorContext.request.post("/api/recipes", {
      headers: { "x-requested-with": "oven-salon" },
      data: recipe,
    });
    expect(created.status()).toBe(201);
    recipeId = (await created.json()).id as string;

    await page.goto("/#/recipes");
    await page
      .getByLabel("레시피 검색")
      .fill(`아몬드 테스트 휘낭시에 ${unique}`);
    await expect(
      page.getByRole("link", { name: `${recipe.title} 레시피 보기` }),
    ).toBeVisible();
    await page.getByLabel("레시피 검색").fill("");
    await page.getByRole("button", { name: "아몬드가루", exact: true }).click();
    await expect(
      page.getByRole("link", { name: `${recipe.title} 레시피 보기` }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: `${recipe.title} 레시피 보기` })
      .click();
    await page.getByRole("button", { name: "베이커 팔로우" }).click();
    await expect(page.getByRole("button", { name: "팔로잉" })).toBeVisible();
    await page.getByRole("button", { name: "좋아요 0" }).click();
    await expect(page.getByRole("button", { name: "좋아요 1" })).toBeVisible();
    await page
      .getByRole("button", { name: "재료 4인분 장보기 목록에 담기" })
      .click();
    await page.getByRole("link", { name: "장보기 목록 보기 →" }).click();
    await expect(page.getByText("아몬드가루")).toBeVisible();
    shoppingId = (
      await (await page.request.get("/api/shopping-list")).json()
    )[0].id;
    await page.getByRole("checkbox").click();
    await expect(page.getByRole("checkbox")).toBeChecked();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/#/recipes/${recipeId}`);
    await page.getByRole("button", { name: "조리 모드 시작" }).click();
    await expect(
      page.getByRole("button", { name: "조리 모드 종료" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "15분 타이머" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "베이킹 타이머" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "타이머 일시정지" }).click();
    await expect(
      page.getByRole("button", { name: "타이머 시작" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "타이머 닫기" }).click();
    await page.getByRole("button", { name: "조리 모드 종료" }).click();
    await page
      .getByLabel("내 베이킹 후기")
      .fill("직접 구워보니 고소하고 촉촉해요.");
    await page
      .locator(".review-upload input[type=file]")
      .setInputFiles(resolve("apps/homebakers/public/images/madeleines.webp"));
    await expect(page.getByAltText("올릴 완성 사진 미리보기")).toBeVisible();
    await page.getByRole("button", { name: "후기 올리기" }).click();
    await expect(
      page.getByText("직접 구워보니 고소하고 촉촉해요."),
    ).toBeVisible();

    const next = await authorContext.request.post("/api/recipes", {
      headers: { "x-requested-with": "oven-salon" },
      data: { ...recipe, title: `새 레시피 ${unique}` },
    });
    expect(next.status()).toBe(201);
    nextRecipeId = (await next.json()).id as string;
    await page.goto("/#/notifications");
    await expect(page.getByText(`새 레시피 ${unique}`)).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page
      .locator(".notification-item")
      .filter({ hasText: `새 레시피 ${unique}` })
      .click();
    await page.goto("/#/notifications");
    await expect(page.getByRole("link", { name: "알림 0개" })).toBeVisible();

    const post = await authorContext.request.post("/api/posts", {
      headers: { "x-requested-with": "oven-salon" },
      data: {
        category: "이야기",
        title: `좋아요 테스트 글 ${unique}`,
        body: "함께 구워요.",
      },
    });
    expect(post.status()).toBe(201);
    postId = (await post.json()).id as string;
    await page.goto("/#/community");
    const postCard = page
      .locator(".community-post")
      .filter({ hasText: `좋아요 테스트 글 ${unique}` });
    await postCard.getByRole("button", { name: "좋아요 0" }).click();
    await expect(
      postCard.getByRole("button", { name: "좋아요 1" }),
    ).toBeVisible();
    await postCard
      .getByRole("link", { name: `좋아요 테스트 글 ${unique}` })
      .click();
    await expect(page.getByRole("button", { name: "팔로잉" })).toBeVisible();
  } finally {
    const headers = { "x-requested-with": "oven-salon" };
    if (postId)
      await authorContext.request
        .delete(`/api/posts/${postId}`, { headers })
        .catch(() => undefined);
    if (nextRecipeId)
      await authorContext.request
        .delete(`/api/recipes/${nextRecipeId}`, { headers })
        .catch(() => undefined);
    if (recipeId)
      await authorContext.request
        .delete(`/api/recipes/${recipeId}`, { headers })
        .catch(() => undefined);
    if (shoppingId)
      await page.request
        .delete(`/api/shopping-list/${shoppingId}`, { headers })
        .catch(() => undefined);
    await authorContext.close();
  }
});
