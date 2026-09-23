import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { OAuth2Client, LoginTicket } from "google-auth-library";
import Fastify from "fastify";
import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Pool } from "pg";
import { registerHomebakers } from "./routes.js";
import { registerRemoteMcp } from "./remote-mcp.js";
import { hashPassword, verifyPassword, imageType } from "./security.js";

describe("Homebakers authentication and community", () => {
  const db = new PGlite();
  const app = Fastify();
  const googleApp = Fastify();
  let first = "",
    second = "",
    recipeId = "",
    postId = "",
    mcpTokenFile = "";
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
  const mcpJson = (body: string) =>
    JSON.parse(
      body.startsWith("event:")
        ? body
            .split("\n")
            .find((line) => line.startsWith("data: "))!
            .slice(6)
        : body,
    );
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
    await db.exec(
      await readFile(
        new URL(
          "../../../../db/migrations/004_recipe_mcp.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../../../../db/migrations/005_mcp_connections.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL("../../../../db/migrations/006_mcp_oauth.sql", import.meta.url),
        "utf8",
      ),
    );
    mcpTokenFile = join(
      await mkdtemp(join(tmpdir(), "oven-mcp-test-")),
      "token",
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
      mcpTokenFile,
    });
    await registerRemoteMcp(app, pool, {
      publicUrl: "http://127.0.0.1:3002/mcp",
      appOrigin: "http://127.0.0.1:5173",
      internalApiUrl: () =>
        `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`,
      production: false,
    });
    await app.ready();
    await app.listen({ port: 0, host: "127.0.0.1" });
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
  it("issues separate MCP tokens per user and provider, scopes them, and revokes independently", async () => {
    const registered = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: headers(),
      payload: {
        email: "mcp-baker@example.com",
        password: "mcp-test-password-123",
        name: "MCP 베이커",
      },
    });
    expect(registered.statusCode).toBe(201);
    const cookie = String(registered.headers["set-cookie"]).split(";")[0];
    const paired = await app.inject({
      method: "POST",
      url: "/api/auth/mcp",
      headers: headers(cookie),
      payload: { provider: "codex" },
    });
    expect(paired.statusCode).toBe(200);
    expect(paired.json().connection).toMatchObject({
      provider: "codex",
      localConnected: true,
    });
    const key = (await readFile(mcpTokenFile, "utf8")).trim();
    expect(paired.json().token).toBe(key);
    const claude = await app.inject({
      method: "POST",
      url: "/api/auth/mcp",
      headers: headers(cookie),
      payload: { provider: "claude" },
    });
    expect(claude.statusCode).toBe(200);
    expect(claude.json().token).not.toBe(key);
    const connections = await app.inject({
      method: "GET",
      url: "/api/auth/mcp",
      headers: headers(cookie),
    });
    expect(connections.json().connections).toHaveLength(2);
    expect(JSON.stringify(connections.json())).not.toContain(key);
    const other = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      headers: headers(),
      payload: {
        email: "other-mcp@example.com",
        password: "mcp-test-password-123",
        name: "다른 베이커",
      },
    });
    const otherCookie = String(other.headers["set-cookie"]).split(";")[0];
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/api/auth/mcp",
          headers: headers(otherCookie),
        })
      ).json().connections,
    ).toHaveLength(0);
    const otherClaude = await app.inject({
      method: "POST",
      url: "/api/auth/mcp",
      headers: headers(otherCookie),
      payload: { provider: "claude" },
    });
    expect(otherClaude.statusCode).toBe(200);
    expect(otherClaude.json().token).not.toBe(claude.json().token);
    const otherIdentity = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${otherClaude.json().token}` },
    });
    expect(otherIdentity.json().user.email).toBe("other-mcp@example.com");
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/auth/mcp/${paired.json().connection.id}`,
          headers: headers(otherCookie),
        })
      ).statusCode,
    ).toBe(404);
    const bearer = {
      "x-requested-with": "oven-salon",
      authorization: `Bearer ${key}`,
    };
    const status = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: bearer,
    });
    expect(status.json().user.email).toBe("mcp-baker@example.com");
    const boundary = "oven-mcp-boundary";
    const form = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="step.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const uploaded = await app.inject({
      method: "POST",
      url: "/api/uploads",
      headers: {
        ...bearer,
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload: form,
    });
    expect(uploaded.statusCode).toBe(201);
    const image = uploaded.json().url as string;
    const created = await app.inject({
      method: "POST",
      url: "/api/recipes",
      headers: bearer,
      payload: { ...recipe, image, steps: [{ ...recipe.steps[0], image }] },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().authorId).toBe(status.json().user.id);
    const forbidden = await app.inject({
      method: "POST",
      url: "/api/posts",
      headers: bearer,
      payload: {},
    });
    expect(forbidden.statusCode).toBe(403);
    const rotated = await app.inject({
      method: "POST",
      url: "/api/auth/mcp",
      headers: headers(cookie),
      payload: { provider: "codex" },
    });
    expect(rotated.statusCode).toBe(200);
    expect(rotated.json().connection.id).toBe(paired.json().connection.id);
    expect(rotated.json().token).not.toBe(key);
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/api/auth/me",
          headers: bearer,
        })
      ).statusCode,
    ).toBe(401);
    const disconnected = await app.inject({
      method: "DELETE",
      url: `/api/auth/mcp/${rotated.json().connection.id}`,
      headers: headers(cookie),
    });
    expect(disconnected.statusCode).toBe(200);
    const rejected = await app.inject({
      method: "POST",
      url: "/api/recipes",
      headers: { ...bearer, authorization: `Bearer ${rotated.json().token}` },
      payload: recipe,
    });
    expect(rejected.statusCode).toBe(401);
    const remaining = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${claude.json().token}` },
    });
    expect(remaining.json().user.email).toBe("mcp-baker@example.com");
  });
  it("connects a remote MCP client with OAuth PKCE and scopes writes to its user", async () => {
    const registered = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: headers(),
      payload: {
        email: "mcp-baker@example.com",
        password: "mcp-test-password-123",
      },
    });
    const cookie = String(registered.headers["set-cookie"]).split(";")[0];
    const metadata = await app.inject({
      method: "GET",
      url: "/.well-known/oauth-protected-resource",
    });
    expect(metadata.json().resource).toBe("http://127.0.0.1:3002/mcp");
    const unauthorized = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: { host: "127.0.0.1:3002" },
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "test", version: "1" },
        },
      },
    });
    expect(unauthorized.statusCode).toBe(401);
    expect(unauthorized.headers["www-authenticate"]).toContain(
      "resource_metadata",
    );
    const client = await app.inject({
      method: "POST",
      url: "/oauth/register",
      payload: {
        client_name: "Test Claude",
        redirect_uris: ["http://127.0.0.1:9797/callback"],
        token_endpoint_auth_method: "none",
      },
    });
    expect(client.statusCode).toBe(201);
    const clientId = client.json().client_id as string;
    const verifier = "v".repeat(43);
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const query = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: "http://127.0.0.1:9797/callback",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: "test-state",
      resource: "http://127.0.0.1:3002/mcp",
      scope: "recipes:write",
    });
    const wrongRedirect = new URLSearchParams(query);
    wrongRedirect.set("redirect_uri", "https://attacker.example/callback");
    expect(
      (
        await app.inject({
          method: "GET",
          url: `/oauth/authorize?${wrongRedirect}`,
        })
      ).statusCode,
    ).toBe(400);
    const authorize = await app.inject({
      method: "GET",
      url: `/oauth/authorize?${query}`,
    });
    expect(authorize.statusCode).toBe(303);
    const pendingId = String(authorize.headers.location).split("/").at(-1)!;
    const pending = await app.inject({
      method: "GET",
      url: `/api/oauth/pending/${pendingId}`,
      headers: headers(cookie),
    });
    expect(pending.json().clientName).toBe("Test Claude");
    const approved = await app.inject({
      method: "POST",
      url: `/api/oauth/pending/${pendingId}`,
      headers: headers(cookie),
      payload: { approve: true },
    });
    expect(approved.statusCode).toBe(200);
    const callback = new URL(approved.json().redirectTo);
    expect(callback.searchParams.get("state")).toBe("test-state");
    const code = callback.searchParams.get("code")!;
    const exchanged = await app.inject({
      method: "POST",
      url: "/oauth/token",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        redirect_uri: "http://127.0.0.1:9797/callback",
        code,
        code_verifier: verifier,
        resource: "http://127.0.0.1:3002/mcp",
      }).toString(),
    });
    expect(exchanged.statusCode).toBe(200);
    const access = exchanged.json().access_token as string;
    const bearer = {
      authorization: `Bearer ${access}`,
      "x-requested-with": "oven-salon",
      accept: "application/json, text/event-stream",
      host: "127.0.0.1:3002",
    };
    const initialized = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: bearer,
      payload: {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "test", version: "1" },
        },
      },
    });
    expect(initialized.statusCode).toBe(200);
    expect(mcpJson(initialized.body).result.serverInfo.name).toBe(
      "homebakers-recipes",
    );
    const tools = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: bearer,
      payload: { jsonrpc: "2.0", id: 2, method: "tools/list" },
    });
    expect(
      mcpJson(tools.body).result.tools.map(
        (tool: { name: string }) => tool.name,
      ),
    ).toEqual(["create_recipe_from_name", "create_recipe"]);
    const published = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: bearer,
      payload: {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "create_recipe",
          arguments: {
            title: "원격 MCP 마들렌",
            description: recipe.description,
            category: recipe.category,
            difficulty: recipe.difficulty,
            minutes: recipe.minutes,
            servings: recipe.servings,
            ingredients: recipe.ingredients,
            steps: [{ ...recipe.steps[0], imageUrl: recipe.image }],
            coverImageUrl: recipe.image,
          },
        },
      },
    });
    expect(published.statusCode).toBe(200);
    expect(mcpJson(published.body).result.isError).not.toBe(true);
    const publishedRecipe = JSON.parse(
      mcpJson(published.body).result.content[0].text,
    );
    expect(publishedRecipe.title).toBe("원격 MCP 마들렌");
    const saved = await app.inject({
      method: "POST",
      url: "/api/recipes",
      headers: bearer,
      payload: recipe,
    });
    expect(saved.statusCode).toBe(201);
    expect(saved.json().authorId).toBe(registered.json().user.id);
    const replay = await app.inject({
      method: "POST",
      url: "/oauth/token",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        redirect_uri: "http://127.0.0.1:9797/callback",
        code,
        code_verifier: verifier,
      }).toString(),
    });
    expect(replay.statusCode).toBe(400);
    const refreshed = await app.inject({
      method: "POST",
      url: "/oauth/token",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      payload: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: exchanged.json().refresh_token,
      }).toString(),
    });
    expect(refreshed.statusCode).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/mcp",
          headers: bearer,
          payload: { jsonrpc: "2.0", id: 4, method: "tools/list" },
        })
      ).statusCode,
    ).toBe(401);
    const refreshedBearer = {
      ...bearer,
      authorization: `Bearer ${refreshed.json().access_token}`,
    };
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/mcp",
          headers: refreshedBearer,
          payload: { jsonrpc: "2.0", id: 5, method: "tools/list" },
        })
      ).statusCode,
    ).toBe(200);
    const grants = await app.inject({
      method: "GET",
      url: "/api/oauth/grants",
      headers: headers(cookie),
    });
    expect(grants.json().grants[0].name).toBe("Test Claude");
    const otherLogin = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      headers: headers(),
      payload: {
        email: "other-mcp@example.com",
        password: "mcp-test-password-123",
      },
    });
    const otherCookie = String(otherLogin.headers["set-cookie"]).split(";")[0];
    expect(
      (
        await app.inject({
          method: "GET",
          url: "/api/oauth/grants",
          headers: headers(otherCookie),
        })
      ).json().grants,
    ).toHaveLength(0);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: `/api/oauth/grants/${grants.json().grants[0].id}`,
          headers: headers(otherCookie),
        })
      ).statusCode,
    ).toBe(404);
    const revoked = await app.inject({
      method: "DELETE",
      url: `/api/oauth/grants/${grants.json().grants[0].id}`,
      headers: headers(cookie),
    });
    expect(revoked.statusCode).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/mcp",
          headers: refreshedBearer,
          payload: { jsonrpc: "2.0", id: 6, method: "tools/list" },
        })
      ).statusCode,
    ).toBe(401);
  });
  it("verifies Google tokens with the expected audience and rejects forged tokens", async () => {
    const verifier = vi.spyOn(
      OAuth2Client.prototype as unknown as {
        verifyIdToken: (options: {
          idToken: string;
          audience: string;
        }) => Promise<LoginTicket>;
      },
      "verifyIdToken",
    );
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
