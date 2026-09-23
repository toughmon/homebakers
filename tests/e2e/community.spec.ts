import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

test("email account, recipe, upload, community, comments, bookmarks and logout", async ({
  page,
}) => {
  const unique = Date.now();
  const email = `baker-${unique}@example.com`,
    name = `베이커${unique}`,
    password = "Baking-test-password-2026";
  await page.goto("/");
  await page.getByRole("link", { name: "로그인", exact: true }).click();
  await page.getByRole("button", { name: "처음 오셨나요? 회원가입" }).click();
  await page.getByLabel("닉네임").fill(name);
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `${name} 님의 오븐` }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "레시피 등록 도구" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "토큰 발급" })).toBeVisible();
  await page.getByLabel("연결 대상").selectOption("claude");
  await page.getByRole("button", { name: "토큰 발급" }).click();
  await expect(page.getByLabel("Claude 토큰 · 지금만 표시됩니다")).toHaveValue(
    /^[A-Za-z0-9_-]{43}$/,
  );
  await page.getByRole("link", { name: "레시피 쓰기 →" }).click();
  await page
    .getByLabel("레시피 제목", { exact: true })
    .fill(`테스트 마들렌 ${unique}`);
  await page
    .getByLabel("짧은 소개")
    .fill("통합 테스트에서 등록한 레시피입니다.");
  await page.getByLabel("1번째 재료 이름").fill("밀가루");
  await page.getByLabel("1번째 재료 양").fill("120");
  await page.getByLabel("1번째 단계 제목").fill("반죽 섞기");
  await page
    .getByLabel("1번째 단계 설명")
    .fill("버터와 밀가루를 고르게 섞습니다.");
  await page
    .locator("input[type=file]")
    .last()
    .setInputFiles(resolve("apps/homebakers/public/images/madeleines.webp"));
  await expect(page.locator(".image-choice-card > img")).toHaveAttribute(
    "src",
    /\/api\/uploads\//,
  );
  await page
    .getByRole("button", { name: "레시피 올리기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: `테스트 마들렌 ${unique}`, exact: true }),
  ).toBeVisible();
  const createdRecipeId = new URL(page.url()).hash.split("/").at(-1)!;
  const recipeResponse = await page.request.get(`/api/recipes/${createdRecipeId}`);
  expect(recipeResponse.ok()).toBe(true);
  const existingRecipe = await recipeResponse.json();
  await page.goto("/#/account");
  await expect(
    page.getByRole("link", { name: `테스트 마들렌 ${unique} →` }),
  ).toBeVisible();
  const externalTitle = `외부 등록 콘브레드 ${unique}`;
  const externalResponse = await page.request.post("/api/recipes", {
    data: {
      title: externalTitle,
      description: existingRecipe.description,
      image: existingRecipe.image,
      category: existingRecipe.category,
      difficulty: existingRecipe.difficulty,
      minutes: existingRecipe.minutes,
      servings: existingRecipe.servings,
      ingredients: existingRecipe.ingredients,
      steps: existingRecipe.steps,
    },
    headers: { "x-requested-with": "oven-salon" },
  });
  expect(externalResponse.ok()).toBe(true);
  const externalRecipe = await externalResponse.json();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByRole("link", { name: `${externalTitle} →` })).toBeVisible();
  const deleteExternal = await page.request.delete(`/api/recipes/${externalRecipe.id}`, {
    headers: { "x-requested-with": "oven-salon" },
  });
  expect(deleteExternal.ok()).toBe(true);
  await page.goto(`/#/recipes/${createdRecipeId}`);
  await page.getByRole("button", { name: "저장하기", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "저장됨", exact: true }),
  ).toBeVisible();
  await page.getByLabel("댓글 내용").fill("레시피 댓글도 저장됩니다.");
  await page.getByRole("button", { name: "댓글 등록" }).click();
  await expect(
    page.getByText("레시피 댓글도 저장됩니다.", { exact: true }),
  ).toBeVisible();
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/recipe-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("link", { name: "레시피 수정", exact: true }).click();
  await page
    .getByLabel("레시피 제목", { exact: true })
    .fill(`수정한 마들렌 ${unique}`);
  await page.getByRole("button", { name: "수정 완료", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `수정한 마들렌 ${unique}`, exact: true }),
  ).toBeVisible();
  await page.goto("/#/community");
  await page.getByRole("button", { name: "이야기 쓰기", exact: true }).click();
  await page.getByLabel("제목", { exact: true }).fill(`테스트 후기 ${unique}`);
  await page
    .getByLabel("내용", { exact: true })
    .fill("직접 구운 마들렌을 공유합니다.");
  await page
    .getByLabel("연결할 레시피")
    .selectOption({ label: `수정한 마들렌 ${unique}` });
  await page
    .getByRole("button", { name: "이야기 올리기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: `테스트 후기 ${unique}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: "♡ 좋아요 0" }).click();
  await expect(page.getByRole("button", { name: "♡ 좋아요 1" })).toBeVisible();
  await page.getByLabel("댓글 내용").fill("커뮤니티 댓글입니다.");
  await page.getByRole("button", { name: "댓글 등록" }).click();
  await expect(
    page.getByText("커뮤니티 댓글입니다.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("커뮤니티 댓글입니다.", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".owner-actions")
    .getByRole("link", { name: "수정", exact: true })
    .click();
  await page.getByLabel("제목", { exact: true }).fill(`수정한 후기 ${unique}`);
  await page.getByRole("button", { name: "수정 완료", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `수정한 후기 ${unique}` }),
  ).toBeVisible();
  await expect(
    page.getByText("커뮤니티 댓글입니다.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/community-detail.png",
    fullPage: true,
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .locator(".owner-actions")
    .getByRole("button", { name: "삭제", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/community$/);
  await page.goto("/#/account");
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await page.getByRole("link", { name: "로그인", exact: true }).click();
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: `${name} 님의 오븐` }),
  ).toBeVisible();
  await page.goto("/#/saved");
  await page
    .getByRole("heading", { name: `수정한 마들렌 ${unique}`, exact: true })
    .click();
  await page
    .locator(".owner-actions")
    .getByRole("button", { name: "삭제", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/recipes$/);
});

test("remote MCP connection returns to consent after Homebakers login", async ({
  page,
  request,
}) => {
  const created = await request.post("http://127.0.0.1:3002/oauth/register", {
    data: {
      client_name: "E2E MCP client",
      redirect_uris: ["http://127.0.0.1:9797/callback"],
    },
  });
  expect(created.ok()).toBeTruthy();
  const { client_id } = await created.json();
  const verifier = "e".repeat(43);
  const query = new URLSearchParams({
    response_type: "code",
    client_id,
    redirect_uri: "http://127.0.0.1:9797/callback",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    resource: "http://127.0.0.1:3002/mcp",
    scope: "recipes:write",
    state: "e2e-state",
  });
  await page.route("http://127.0.0.1:9797/callback**", async (route) => {
    await route.fulfill({ status: 200, body: "Connected" });
  });
  await page.goto(`http://127.0.0.1:3002/oauth/authorize?${query}`);
  await expect(
    page.getByRole("heading", { name: "다시 만나 반가워요" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "처음 오셨나요? 회원가입" }).click();
  const unique = Date.now();
  await page.getByLabel("닉네임").fill(`원격${unique}`);
  await page
    .getByLabel("이메일", { exact: true })
    .fill(`remote-${unique}@example.com`);
  await page
    .getByLabel("비밀번호", { exact: true })
    .fill("Baking-test-password-2026");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "레시피 등록 연결" }),
  ).toBeVisible();
  await expect(page.getByText("E2E MCP client")).toBeVisible();
  await page.getByRole("button", { name: "연결 허용" }).click();
  await page.waitForURL(/127\.0\.0\.1:9797\/callback/);
  const callback = new URL(page.url());
  expect(callback.searchParams.get("state")).toBe("e2e-state");
  expect(callback.searchParams.get("code")).toMatch(/^[A-Za-z0-9_-]{43}$/);
});
