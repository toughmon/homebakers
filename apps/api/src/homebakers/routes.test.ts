import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { OAuth2Client, LoginTicket } from "google-auth-library";
import Fastify from "fastify";
import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Pool } from "pg";
import { registerHomebakers } from "./routes.js";
import { hashPassword, verifyPassword, imageType } from "./security.js";

describe("Homebakers authentication and community", () => {
  const db = new PGlite();
  const app = Fastify();
  const googleApp = Fastify();
  let first = "",
    second = "",
    recipeId = "",
    postId = "";
  const headers = (cookie = "") => ({
    "x-requested-with": "oven-salon",
    origin: "http://127.0.0.1:5173",
    cookie,
  });
  const recipe = {
    title: "테스트 마들렌",
    description: "단계별 레시피",
    image: "/images/madeleines.webp",
    category: "구움과자",
    difficulty: "쉬움",
    minutes: 30,
    servings: 4,
    ingredients: [{ name: "밀가루", amount: 100, unit: "g" }],
    steps: [{ title: "섞기", body: "재료를 섞어요", minutes: 5 }],
  };
  beforeAll(async () => {
    await db.exec(
      await readFile(
        new URL(
          "../../../../db/migrations/003_homebakers.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const pool = {
      query: async (text: string, values?: unknown[]) => {
        const result = await db.query(text, values);
        return {
          rows: result.rows,
          rowCount: result.affectedRows ?? result.rows.length,
        };
      },
    } as unknown as Pool;
    await registerHomebakers(app, pool, {
      origin: "http://127.0.0.1:5173",
      production: false,
      uploads: await mkdtemp(join(tmpdir(), "oven-test-")),
    });
    await app.ready();
    await registerHomebakers(googleApp, pool, {
      origin: "http://127.0.0.1:5173",
      production: false,
      googleClientId: "test-client.apps.googleusercontent.com",
      uploads: await mkdtemp(join(tmpdir(), "oven-google-test-")),
    });
    await googleApp.ready();
  }, 30000);
  afterAll(async () => {
    await app.close();
    await googleApp.close();
    await db.close();
  });
  it("rejects cross-origin and unauthenticated writes", async () => {
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/recipes",
          payload: recipe,
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/recipes",
          headers: { ...headers(), origin: "https://attacker.example" },
          payload: recipe,
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/recipes",
          headers: headers(),
          payload: recipe,
        })
      ).statusCode,
    ).toBe(401);
  });
  it("verifies Google tokens with the expected audience and rejects forged tokens", async () => {
    const verifier = vi.spyOn(OAuth2Client.prototype as unknown as {
      verifyIdToken: (options: { idToken: string; audience: string }) => Promise<LoginTicket>
    }, "verifyIdToken");
    try {
      verifier.mockRejectedValueOnce(new Error("Invalid signature"));
      const invalid = await googleApp.inject({
        method: "POST",
        url: "/api/auth/google",
        headers: headers(),
        payload: { credential: "forged-google-token" },
      });
      expect(invalid.statusCode).toBe(401);
      verifier.mockResolvedValueOnce(
        new LoginTicket(undefined, {
          iss: "https://accounts.google.com",
          aud: "test-client.apps.googleusercontent.com",
          sub: "google-user-123",
          email: "google-baker@gmail.com",
          email_verified: true,
          name: "구글 베이커",
          iat: 0,
          exp: 9999999999,
        }),
      );
      const valid = await googleApp.inject({
        method: "POST",
        url: "/api/auth/google",
        headers: headers(),
        payload: { credential: "valid-mocked-google-token" },
      });
      expect(valid.statusCode).toBe(200);
      expect(valid.json().user.email).toBe("google-baker@gmail.com");
      expect(verifier).toHaveBeenLastCalledWith({
        idToken: "valid-mocked-google-token",
        audience: "test-client.apps.googleusercontent.com",
      });
      const session = String(valid.headers["set-cookie"]).split(";")[0];
      expect(
        (
          await googleApp.inject({
            url: "/api/auth/me",
            headers: headers(session),
          })
        ).json().user.name,
      ).toBe("구글 베이커");
    } finally {
      verifier.mockRestore();
    }
  });
  it("registers users with HttpOnly sessions and stores no plaintext password", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: headers(),
      payload: {
        email: "Baker@Example.com",
        password: "baking-password-123",
        name: "첫 베이커",
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().user.email).toBe("baker@example.com");
    expect(response.headers["set-cookie"]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]).toContain("SameSite=Lax");
    first = String(response.headers["set-cookie"]).split(";")[0];
    const row = await db.query<{ password_hash: string }>(
      "SELECT password_hash FROM baker_users WHERE email=$1",
      ["baker@example.com"],
    );
    expect(row.rows[0].password_hash).not.toContain("baking-password");
    const other = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: headers(),
      payload: {
        email: "other@example.com",
        password: "another-password-123",
        name: "둘째 베이커",
      },
    });
    second = String(other.headers["set-cookie"]).split(";")[0];
    expect(
      (
        await app.inject({ url: "/api/auth/me", headers: headers(first) })
      ).json().user.name,
    ).toBe("첫 베이커");
  });
  it("rejects wrong passwords and duplicate email, logs in with normalized email", async () => {
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/login",
          headers: headers(),
          payload: { email: "baker@example.com", password: "wrong-password" },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/register",
          headers: headers(),
          payload: {
            email: "baker@example.com",
            password: "baking-password-123",
            name: "중복",
          },
        })
      ).statusCode,
    ).toBe(409);
    const result = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: headers(),
      payload: { email: "BAKER@example.com", password: "baking-password-123" },
    });
    expect(result.statusCode).toBe(200);
  });
  it("creates, reads, updates recipes and enforces ownership", async () => {
    const result = await app.inject({
      method: "POST",
      url: "/api/recipes",
      headers: headers(first),
      payload: recipe,
    });
    expect(result.statusCode).toBe(201);
    recipeId = result.json().id;
    expect(
      (await app.inject({ url: `/api/recipes/${recipeId}` })).json()
        .ingredients[0].amount,
    ).toBe(100);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/api/recipes/${recipeId}`,
          headers: headers(second),
          payload: { ...recipe, title: "변조" },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/api/recipes/${recipeId}`,
          headers: headers(first),
          payload: { ...recipe, title: "수정한 마들렌" },
        })
      ).json().title,
    ).toBe("수정한 마들렌");
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/recipes",
          headers: headers(first),
          payload: { ...recipe, ingredients: [] },
        })
      ).statusCode,
    ).toBe(400);
  });
  it("persists bookmarks idempotently and isolates them by user", async () => {
    for (let i = 0; i < 2; i++)
      expect(
        (
          await app.inject({
            method: "PUT",
            url: `/api/bookmarks/${recipeId}`,
            headers: headers(first),
          })
        ).statusCode,
      ).toBe(200);
    expect(
      (
        await app.inject({ url: "/api/bookmarks", headers: headers(first) })
      ).json(),
    ).toEqual([recipeId]);
    expect(
      (
        await app.inject({ url: "/api/bookmarks", headers: headers(second) })
      ).json(),
    ).toEqual([]);
  });
  it("creates and edits posts, likes, and comments with author controls", async () => {
    const result = await app.inject({
      method: "POST",
      url: "/api/posts",
      headers: headers(first),
      payload: {
        category: "굽기 후기",
        title: "완성했어요",
        body: "정말 맛있어요",
        recipeId,
      },
    });
    expect(result.statusCode).toBe(201);
    postId = result.json().id;
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/api/posts/${postId}/like`,
          headers: headers(second),
        })
      ).statusCode,
    ).toBe(200);
    const comment = await app.inject({
      method: "POST",
      url: `/api/posts/${postId}/comments`,
      headers: headers(second),
      payload: { body: "멋져요" },
    });
    expect(comment.statusCode).toBe(201);
    expect(
      (await app.inject({ url: `/api/posts/${postId}` })).json(),
    ).toMatchObject({ likes: 1, comments: 1 });
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/comments/${comment.json().id}`,
          headers: headers(first),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/comments/${comment.json().id}`,
          headers: headers(second),
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/posts/${postId}`,
          headers: headers(second),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "PUT",
          url: `/api/posts/${postId}`,
          headers: headers(first),
          payload: { category: "질문", title: "수정된 글", body: "내용 수정" },
        })
      ).json().title,
    ).toBe("수정된 글");
  });
  it("handles recipe deletion and session logout safely", async () => {
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/recipes/${recipeId}`,
          headers: headers(second),
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/recipes/${recipeId}`,
          headers: headers(first),
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({ url: "/api/bookmarks", headers: headers(first) })
      ).json(),
    ).toEqual([]);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/logout",
          headers: headers(first),
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({ url: "/api/auth/me", headers: headers(first) })
      ).json().user,
    ).toBeNull();
  });
  it("does not accept Google credentials when the provider is unconfigured", async () => {
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/auth/google",
          headers: headers(),
          payload: { credential: "invalid-token" },
        })
      ).statusCode,
    ).toBe(503);
  });
});
it("uses salted password hashes and rejects non-image uploads", async () => {
  const a = await hashPassword("long-enough-password"),
    b = await hashPassword("long-enough-password");
  expect(a).not.toBe(b);
  expect(await verifyPassword("long-enough-password", a)).toBe(true);
  expect(await verifyPassword("incorrect-password", a)).toBe(false);
  expect(imageType(Buffer.from('<svg onload="alert(1)"></svg>'))).toBeNull();
});
