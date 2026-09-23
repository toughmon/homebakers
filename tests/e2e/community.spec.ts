import { test, expect } from "@playwright/test";
import { resolve } from "node:path";

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
