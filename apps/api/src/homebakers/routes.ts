import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import { OAuth2Client } from "google-auth-library";
import { Type, type Static } from "@sinclair/typebox";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, join } from "node:path";
import type { Pool } from "pg";
import {
  digest,
  hashPassword,
  imageType,
  token,
  verifyPassword,
} from "./security.js";
import {
  CommentBody,
  IdParams,
  PostBody,
  RecipeBody,
  type RecipeInput,
} from "./schemas.js";

type User = {
  id: string;
  email: string;
  name: string;
  googleLinked: boolean;
};
declare module "fastify" {
  interface FastifyRequest {
    baker: User | null;
  }
}
type Options = {
  origin: string;
  production: boolean;
  googleClientId?: string;
  uploads: string;
  mcpTokenFile?: string;
  mcpPublicUrl?: string;
};
const credentials = Type.Object(
  {
    email: Type.String({
      minLength: 3,
      maxLength: 254,
      pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    }),
    password: Type.String({ minLength: 10, maxLength: 128 }),
  },
  { additionalProperties: false },
);
const registerBody = Type.Intersect([
  Type.Object({
    email: credentials.properties.email,
    password: credentials.properties.password,
    name: Type.String({ minLength: 2, maxLength: 40, pattern: "\\S" }),
  }),
]);
const googleBody = Type.Object({
  credential: Type.String({ minLength: 10, maxLength: 10000 }),
});
const mcpProvider = Type.Union([
  Type.Literal("codex"),
  Type.Literal("claude"),
  Type.Literal("gemini"),
  Type.Literal("chatgpt"),
  Type.Literal("other"),
]);
const mcpBody = Type.Object(
  { provider: mcpProvider },
  { additionalProperties: false },
);
const mcpParams = Type.Object({ id: Type.String({ format: "uuid" }) });
const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.baker)
    return reply.code(401).send({ message: "로그인이 필요합니다." });
};
const recipeSelect = `SELECT r.*, u.name AS author, r.user_id AS "authorId", (SELECT count(*)::int FROM baker_bookmarks b WHERE b.recipe_id=r.id) AS likes FROM baker_recipes r JOIN baker_users u ON u.id=r.user_id`;
const postSelect = `SELECT p.*, u.name AS author, p.user_id AS "authorId", p.recipe_id AS "recipeId", (SELECT count(*)::int FROM baker_post_likes l WHERE l.post_id=p.id) AS likes, (SELECT count(*)::int FROM baker_comments c WHERE c.post_id=p.id) AS comments FROM baker_posts p JOIN baker_users u ON u.id=p.user_id`;
const recipeView = (row: Record<string, unknown>) => ({
  ...row,
  englishTitle: "COMMUNITY RECIPE",
  createdAt: row.created_at,
});
const postView = (row: Record<string, unknown>) => ({
  ...row,
  recipeId: row.recipeId ?? undefined,
  image: row.image ?? undefined,
  createdAt: row.created_at,
  date: new Date(row.created_at as string).toLocaleDateString("ko-KR"),
});

export async function registerHomebakers(
  app: FastifyInstance,
  pool: Pool,
  options: Options,
) {
  await app.register(async (api) => {
    await api.register(cookie);
    await api.register(multipart, {
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
    });
    await api.register(rateLimit, { global: false });
    api.decorateRequest("baker", null);
    const cookieName = options.production
      ? "__Host-oven-session"
      : "oven-session";
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: options.production,
      sameSite: "lax" as const,
    };
    const allowedOrigins = new Set([
      options.origin,
      ...(!options.production
        ? ["http://localhost:5173", "http://127.0.0.1:5173"]
        : []),
    ]);
    const google = new OAuth2Client(options.googleClientId);
    const dummyHash = await hashPassword(token());
    api.addHook("onRequest", async (request, reply) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
        if (
          request.headers["x-requested-with"] !== "oven-salon" ||
          (request.headers.origin &&
            !allowedOrigins.has(request.headers.origin))
        )
          return reply.code(403).send({ message: "허용되지 않은 요청입니다." });
      }
      const bearer = request.headers.authorization;
      if (bearer) {
        const path = request.url.split("?")[0];
        if (
          ![
            "GET /api/auth/me",
            "POST /api/recipes",
            "POST /api/uploads",
          ].includes(`${request.method} ${path}`)
        )
          return reply.code(403).send({ message: "허용되지 않은 요청입니다." });
        const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(bearer);
        if (!match)
          return reply.code(401).send({ message: "MCP 연결이 필요합니다." });
        const result = await pool.query<User>(
          'SELECT u.id,u.email,u.name,(u.google_sub IS NOT NULL) AS "googleLinked" FROM baker_mcp_connection c JOIN baker_users u ON u.id=c.user_id WHERE c.token_hash=$1 AND c.expires_at>now()',
          [digest(match[1])],
        );
        const user = result.rows[0] ?? (await pool.query<User>(
          'SELECT u.id,u.email,u.name,(u.google_sub IS NOT NULL) AS "googleLinked" FROM baker_oauth_grants g JOIN baker_users u ON u.id=g.user_id WHERE g.access_hash=$1 AND g.access_expires_at>now()',
          [digest(match[1])],
        )).rows[0];
        if (!user)
          return reply
            .code(401)
            .send({ message: "MCP 연결을 다시 설정해주세요." });
        request.baker = user;
        return;
      }
      const session = request.cookies[cookieName];
      if (session && /^[A-Za-z0-9_-]{43}$/.test(session)) {
        const result = await pool.query<User>(
          'SELECT u.id,u.email,u.name,(u.google_sub IS NOT NULL) AS "googleLinked" FROM baker_sessions s JOIN baker_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > now()',
          [digest(session)],
        );
        request.baker = result.rows[0] ?? null;
      }
    });
    api.addHook("onSend", async (_request, reply) => {
      reply.header("X-Content-Type-Options", "nosniff");
      reply.header("Cache-Control", "no-store");
    });
    api.setErrorHandler((error, request, reply) => {
      const issue = error as Error & {
        code?: string;
        statusCode?: number;
        validation?: unknown;
      };
      if (issue.code === "FST_REQ_FILE_TOO_LARGE")
        return reply
          .code(413)
          .send({ message: "5MB 이하의 이미지를 선택해주세요." });
      if (issue.validation)
        return reply
          .code(400)
          .send({ message: "입력값의 길이와 형식을 확인해주세요." });
      if (issue.code === "23505")
        return reply.code(409).send({ message: "이미 등록된 정보입니다." });
      if (issue.code === "23503" || issue.code === "22P02")
        return reply
          .code(404)
          .send({ message: "연결할 항목을 찾을 수 없습니다." });
      if (issue.statusCode && issue.statusCode < 500)
        return reply.code(issue.statusCode).send({
          message:
            issue.statusCode === 429
              ? "요청이 많습니다. 잠시 후 다시 시도해주세요."
              : issue.message,
        });
      request.log.error({ err: issue }, "Homebakers request failed");
      return reply
        .code(500)
        .send({ message: "처리하지 못했습니다. 잠시 후 다시 시도해주세요." });
    });
    async function signIn(
      user: User,
      request: FastifyRequest,
      reply: FastifyReply,
    ) {
      const old = request.cookies[cookieName];
      if (old)
        await pool.query("DELETE FROM baker_sessions WHERE token_hash=$1", [
          digest(old),
        ]);
      await pool.query("DELETE FROM baker_sessions WHERE expires_at <= now()");
      const value = token();
      await pool.query(
        "INSERT INTO baker_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '30 days')",
        [digest(value), user.id],
      );
      reply.setCookie(cookieName, value, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60,
      });
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          googleLinked: user.googleLinked,
        },
      };
    }
    api.get("/api/auth/config", async () => ({
      googleClientId: options.googleClientId ?? null,
      mcpUrl: options.mcpPublicUrl ?? null,
    }));
    api.get("/api/auth/me", async (request) => ({ user: request.baker }));
    api.get("/api/auth/mcp", { preHandler: requireUser }, async (request) => {
      const result = await pool.query<{
        id: string;
        provider: string;
        token_hash: string;
        created_at: string;
        expires_at: string;
      }>(
        "SELECT id,provider,token_hash,created_at,expires_at FROM baker_mcp_connection WHERE user_id=$1 AND expires_at>now() ORDER BY created_at DESC",
        [request.baker!.id],
      );
      const stored = options.mcpTokenFile
        ? await readFile(options.mcpTokenFile, "utf8").catch(() => "")
        : "";
      return {
        localAvailable: !options.production && Boolean(options.mcpTokenFile),
        connections: result.rows.map((row) => ({
          id: row.id,
          provider: row.provider,
          createdAt: row.created_at,
          expiresAt: row.expires_at,
          localConnected:
            !options.production &&
            row.provider === "codex" &&
            Boolean(stored.trim()) &&
            digest(stored.trim()) === row.token_hash,
        })),
      };
    });
    api.post<{ Body: Static<typeof mcpBody> }>(
      "/api/auth/mcp",
      {
        preHandler: requireUser,
        schema: { body: mcpBody },
        config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
      },
      async (request, reply) => {
        const value = token();
        const { provider } = request.body;
        const result = await pool.query<{
          id: string;
          created_at: string;
          expires_at: string;
        }>(
          "INSERT INTO baker_mcp_connection(user_id,provider,token_hash,expires_at) VALUES($1,$2,$3,now()+interval '90 days') ON CONFLICT(user_id,provider) DO UPDATE SET token_hash=EXCLUDED.token_hash,created_at=now(),expires_at=EXCLUDED.expires_at RETURNING id,created_at,expires_at",
          [request.baker!.id, provider, digest(value)],
        );
        const local =
          !options.production &&
          provider === "codex" &&
          Boolean(options.mcpTokenFile);
        if (local) {
          await mkdir(dirname(options.mcpTokenFile!), { recursive: true });
          await writeFile(options.mcpTokenFile!, `${value}\n`, { mode: 0o600 });
        }
        return {
          connection: {
            id: result.rows[0].id,
            provider,
            createdAt: result.rows[0].created_at,
            expiresAt: result.rows[0].expires_at,
            localConnected: local,
          },
          token: value,
        };
      },
    );
    api.delete<{ Params: Static<typeof mcpParams> }>(
      "/api/auth/mcp/:id",
      { preHandler: requireUser, schema: { params: mcpParams } },
      async (request, reply) => {
        const result = await pool.query<{
          provider: string;
          token_hash: string;
        }>(
          "DELETE FROM baker_mcp_connection WHERE id=$1 AND user_id=$2 RETURNING provider,token_hash",
          [request.params.id, request.baker!.id],
        );
        if (!result.rows[0])
          return reply.code(404).send({ message: "연결을 찾을 수 없습니다." });
        if (result.rows[0].provider === "codex" && options.mcpTokenFile) {
          const stored = await readFile(options.mcpTokenFile, "utf8").catch(
            () => "",
          );
          if (
            stored.trim() &&
            digest(stored.trim()) === result.rows[0].token_hash
          )
            await unlink(options.mcpTokenFile).catch(() => undefined);
        }
        return { disconnected: true };
      },
    );
    api.post<{ Body: Static<typeof registerBody> }>(
      "/api/auth/register",
      {
        schema: { body: registerBody },
        config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      },
      async (request, reply) => {
        const { email, password, name } = request.body;
        const result = await pool.query<User>(
          'INSERT INTO baker_users(email,name,password_hash) VALUES($1,$2,$3) RETURNING id,email,name,(google_sub IS NOT NULL) AS "googleLinked"',
          [
            email.trim().toLowerCase(),
            name.trim(),
            await hashPassword(password),
          ],
        );
        reply.code(201);
        return signIn(result.rows[0], request, reply);
      },
    );
    api.post<{ Body: Static<typeof credentials> }>(
      "/api/auth/login",
      {
        schema: { body: credentials },
        config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      },
      async (request, reply) => {
        const result = await pool.query<
          User & { password_hash: string | null }
        >(
          'SELECT id,email,name,password_hash,(google_sub IS NOT NULL) AS "googleLinked" FROM baker_users WHERE email=$1',
          [request.body.email.trim().toLowerCase()],
        );
        const user = result.rows[0];
        const valid = await verifyPassword(
          request.body.password,
          user?.password_hash ?? dummyHash,
        );
        if (!user || !user.password_hash || !valid)
          return reply
            .code(401)
            .send({ message: "이메일 또는 비밀번호를 확인해주세요." });
        return signIn(user, request, reply);
      },
    );
    api.post<{ Body: Static<typeof googleBody> }>(
      "/api/auth/google",
      {
        schema: { body: googleBody },
        config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      },
      async (request, reply) => {
        if (!options.googleClientId)
          return reply
            .code(503)
            .send({ message: "Google 로그인 설정이 준비되지 않았습니다." });
        let identity;
        try {
          identity = (
            await google.verifyIdToken({
              idToken: request.body.credential,
              audience: options.googleClientId,
            })
          ).getPayload();
        } catch {
          return reply
            .code(401)
            .send({ message: "Google 인증을 다시 진행해주세요." });
        }
        if (!identity?.sub || !identity.email || !identity.email_verified)
          return reply
            .code(401)
            .send({ message: "확인된 Google 이메일이 필요합니다." });
        const found = await pool.query<User>(
          'SELECT id,email,name,(google_sub IS NOT NULL) AS "googleLinked" FROM baker_users WHERE google_sub=$1',
          [identity.sub],
        );
        if (found.rows[0]) return signIn(found.rows[0], request, reply);
        const duplicate = await pool.query(
          "SELECT id FROM baker_users WHERE email=$1",
          [identity.email.toLowerCase()],
        );
        if (duplicate.rowCount)
          return reply.code(409).send({
            message:
              "이 이메일로 가입한 계정이 있습니다. 이메일 로그인 후 내 계정에서 Google을 연결해주세요.",
          });
        const created = await pool.query<User>(
          'INSERT INTO baker_users(email,name,google_sub) VALUES($1,$2,$3) RETURNING id,email,name,(google_sub IS NOT NULL) AS "googleLinked"',
          [
            identity.email.toLowerCase(),
            (identity.name || identity.email.split("@")[0]).slice(0, 40),
            identity.sub,
          ],
        );
        return signIn(created.rows[0], request, reply);
      },
    );
    api.post<{ Body: Static<typeof googleBody> }>(
      "/api/auth/google/link",
      {
        preHandler: requireUser,
        schema: { body: googleBody },
        config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      },
      async (request, reply) => {
        if (!options.googleClientId)
          return reply
            .code(503)
            .send({ message: "Google 로그인 설정이 준비되지 않았습니다." });
        let identity;
        try {
          identity = (
            await google.verifyIdToken({
              idToken: request.body.credential,
              audience: options.googleClientId,
            })
          ).getPayload();
        } catch {
          return reply
            .code(401)
            .send({ message: "Google 인증을 다시 진행해주세요." });
        }
        if (
          !identity?.sub ||
          !identity.email_verified ||
          identity.email?.toLowerCase() !== request.baker!.email
        )
          return reply.code(400).send({
            message: "현재 계정과 같은 이메일의 Google 계정을 선택해주세요.",
          });
        await pool.query("UPDATE baker_users SET google_sub=$1 WHERE id=$2", [
          identity.sub,
          request.baker!.id,
        ]);
        return { success: true };
      },
    );
    api.post("/api/auth/logout", async (request, reply) => {
      const value = request.cookies[cookieName];
      if (value)
        await pool.query("DELETE FROM baker_sessions WHERE token_hash=$1", [
          digest(value),
        ]);
      reply.clearCookie(cookieName, cookieOptions);
      return { success: true };
    });
    api.get("/api/recipes", async () =>
      (
        await pool.query(`${recipeSelect} ORDER BY r.created_at DESC LIMIT 500`)
      ).rows.map(recipeView),
    );
    api.get<{ Params: { id: string } }>(
      "/api/recipes/:id",
      { schema: { params: IdParams } },
      async (request, reply) => {
        const row = (
          await pool.query(`${recipeSelect} WHERE r.id=$1`, [request.params.id])
        ).rows[0];
        return row
          ? recipeView(row)
          : reply.code(404).send({ message: "레시피를 찾을 수 없습니다." });
      },
    );
    api.post<{ Body: RecipeInput }>(
      "/api/recipes",
      { preHandler: requireUser, schema: { body: RecipeBody } },
      async (request, reply) => {
        const b = request.body,
          id = randomUUID();
        await pool.query(
          "INSERT INTO baker_recipes(id,user_id,title,description,image,category,difficulty,minutes,servings,ingredients,steps) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
          [
            id,
            request.baker!.id,
            b.title.trim(),
            b.description.trim(),
            b.image,
            b.category,
            b.difficulty,
            b.minutes,
            b.servings,
            JSON.stringify(b.ingredients),
            JSON.stringify(b.steps),
          ],
        );
        reply.code(201);
        return recipeView(
          (await pool.query(`${recipeSelect} WHERE r.id=$1`, [id])).rows[0],
        );
      },
    );
    api.put<{ Params: { id: string }; Body: RecipeInput }>(
      "/api/recipes/:id",
      {
        preHandler: requireUser,
        schema: { params: IdParams, body: RecipeBody },
      },
      async (request, reply) => {
        const b = request.body;
        const result = await pool.query(
          "UPDATE baker_recipes SET title=$1,description=$2,image=$3,category=$4,difficulty=$5,minutes=$6,servings=$7,ingredients=$8,steps=$9,updated_at=now() WHERE id=$10 AND user_id=$11 RETURNING id",
          [
            b.title.trim(),
            b.description.trim(),
            b.image,
            b.category,
            b.difficulty,
            b.minutes,
            b.servings,
            JSON.stringify(b.ingredients),
            JSON.stringify(b.steps),
            request.params.id,
            request.baker!.id,
          ],
        );
        if (!result.rowCount)
          return reply
            .code(404)
            .send({ message: "수정할 레시피가 없거나 작성자가 아닙니다." });
        return recipeView(
          (
            await pool.query(`${recipeSelect} WHERE r.id=$1`, [
              request.params.id,
            ])
          ).rows[0],
        );
      },
    );
    api.delete<{ Params: { id: string } }>(
      "/api/recipes/:id",
      { preHandler: requireUser, schema: { params: IdParams } },
      async (request, reply) => {
        const result = await pool.query(
          "DELETE FROM baker_recipes WHERE id=$1 AND user_id=$2",
          [request.params.id, request.baker!.id],
        );
        return result.rowCount
          ? { success: true }
          : reply
              .code(404)
              .send({ message: "삭제할 레시피가 없거나 작성자가 아닙니다." });
      },
    );
    api.get("/api/bookmarks", { preHandler: requireUser }, async (request) =>
      (
        await pool.query(
          "SELECT recipe_id FROM baker_bookmarks WHERE user_id=$1",
          [request.baker!.id],
        )
      ).rows.map((row) => row.recipe_id),
    );
    for (const method of ["PUT", "DELETE"] as const)
      api.route<{ Params: { id: string } }>({
        method,
        url: "/api/bookmarks/:id",
        preHandler: requireUser,
        schema: { params: IdParams },
        handler: async (request) => {
          await pool.query(
            method === "PUT"
              ? "INSERT INTO baker_bookmarks(user_id,recipe_id) VALUES($1,$2) ON CONFLICT DO NOTHING"
              : "DELETE FROM baker_bookmarks WHERE user_id=$1 AND recipe_id=$2",
            [request.baker!.id, request.params.id],
          );
          return { success: true };
        },
      });
    api.get("/api/posts", async () =>
      (
        await pool.query(`${postSelect} ORDER BY p.created_at DESC LIMIT 500`)
      ).rows.map(postView),
    );
    api.get<{ Params: { id: string } }>(
      "/api/posts/:id",
      { schema: { params: IdParams } },
      async (request, reply) => {
        const row = (
          await pool.query(`${postSelect} WHERE p.id=$1`, [request.params.id])
        ).rows[0];
        return row
          ? postView(row)
          : reply.code(404).send({ message: "글을 찾을 수 없습니다." });
      },
    );
    api.post<{ Body: Static<typeof PostBody> }>(
      "/api/posts",
      { preHandler: requireUser, schema: { body: PostBody } },
      async (request, reply) => {
        const b = request.body;
        const result = await pool.query(
          "INSERT INTO baker_posts(user_id,category,title,body,recipe_id,image) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
          [
            request.baker!.id,
            b.category,
            b.title.trim(),
            b.body.trim(),
            b.recipeId ?? null,
            b.image ?? null,
          ],
        );
        reply.code(201);
        return postView(
          (await pool.query(`${postSelect} WHERE p.id=$1`, [result.rows[0].id]))
            .rows[0],
        );
      },
    );
    api.put<{ Params: { id: string }; Body: Static<typeof PostBody> }>(
      "/api/posts/:id",
      { preHandler: requireUser, schema: { params: IdParams, body: PostBody } },
      async (request, reply) => {
        const b = request.body;
        const result = await pool.query(
          "UPDATE baker_posts SET category=$1,title=$2,body=$3,recipe_id=$4,image=$5,updated_at=now() WHERE id=$6 AND user_id=$7 RETURNING id",
          [
            b.category,
            b.title.trim(),
            b.body.trim(),
            b.recipeId ?? null,
            b.image ?? null,
            request.params.id,
            request.baker!.id,
          ],
        );
        if (!result.rowCount)
          return reply
            .code(404)
            .send({ message: "수정할 글이 없거나 작성자가 아닙니다." });
        return postView(
          (await pool.query(`${postSelect} WHERE p.id=$1`, [request.params.id]))
            .rows[0],
        );
      },
    );
    api.delete<{ Params: { id: string } }>(
      "/api/posts/:id",
      { preHandler: requireUser, schema: { params: IdParams } },
      async (request, reply) => {
        const result = await pool.query(
          "DELETE FROM baker_posts WHERE id=$1 AND user_id=$2",
          [request.params.id, request.baker!.id],
        );
        return result.rowCount
          ? { success: true }
          : reply
              .code(404)
              .send({ message: "삭제할 글이 없거나 작성자가 아닙니다." });
      },
    );
    api.get("/api/post-likes", { preHandler: requireUser }, async (request) =>
      (
        await pool.query(
          "SELECT post_id FROM baker_post_likes WHERE user_id=$1",
          [request.baker!.id],
        )
      ).rows.map((row) => row.post_id),
    );
    for (const method of ["PUT", "DELETE"] as const)
      api.route<{ Params: { id: string } }>({
        method,
        url: "/api/posts/:id/like",
        preHandler: requireUser,
        schema: { params: IdParams },
        handler: async (request) => {
          await pool.query(
            method === "PUT"
              ? "INSERT INTO baker_post_likes(user_id,post_id) VALUES($1,$2) ON CONFLICT DO NOTHING"
              : "DELETE FROM baker_post_likes WHERE user_id=$1 AND post_id=$2",
            [request.baker!.id, request.params.id],
          );
          return { success: true };
        },
      });
    for (const [kind, column] of [
      ["recipes", "recipe_id"],
      ["posts", "post_id"],
    ] as const) {
      api.get<{ Params: { id: string } }>(
        `/api/${kind}/:id/comments`,
        { schema: { params: IdParams } },
        async (request) =>
          (
            await pool.query(
              `SELECT c.id,c.body,c.created_at AS "createdAt",c.user_id AS "authorId",u.name AS author FROM baker_comments c JOIN baker_users u ON u.id=c.user_id WHERE c.${column}=$1 ORDER BY c.created_at`,
              [request.params.id],
            )
          ).rows,
      );
      api.post<{ Params: { id: string }; Body: Static<typeof CommentBody> }>(
        `/api/${kind}/:id/comments`,
        {
          preHandler: requireUser,
          schema: { params: IdParams, body: CommentBody },
          config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
        },
        async (request, reply) => {
          const result = await pool.query(
            `INSERT INTO baker_comments(user_id,${column},body) VALUES($1,$2,$3) RETURNING id,body,created_at AS "createdAt",user_id AS "authorId"`,
            [request.baker!.id, request.params.id, request.body.body.trim()],
          );
          return reply
            .code(201)
            .send({ ...result.rows[0], author: request.baker!.name });
        },
      );
    }
    api.delete<{ Params: { id: string } }>(
      "/api/comments/:id",
      { preHandler: requireUser, schema: { params: IdParams } },
      async (request, reply) => {
        const result = await pool.query(
          "DELETE FROM baker_comments WHERE id=$1 AND user_id=$2",
          [request.params.id, request.baker!.id],
        );
        return result.rowCount
          ? { success: true }
          : reply
              .code(404)
              .send({ message: "삭제할 댓글이 없거나 작성자가 아닙니다." });
      },
    );
    api.post(
      "/api/uploads",
      {
        preHandler: requireUser,
        config: { rateLimit: { max: 30, timeWindow: "1 hour" } },
      },
      async (request, reply) => {
        const file = await request.file();
        if (!file)
          return reply.code(400).send({ message: "이미지를 선택해주세요." });
        const buffer = await file.toBuffer();
        const extension = imageType(buffer);
        if (!extension)
          return reply
            .code(400)
            .send({ message: "JPG, PNG, WebP 이미지만 올릴 수 있습니다." });
        await mkdir(options.uploads, { recursive: true });
        const name = `${randomUUID()}.${extension}`;
        await writeFile(join(options.uploads, name), buffer, { flag: "wx" });
        return reply.code(201).send({ url: `/api/uploads/${name}` });
      },
    );
    api.get<{ Params: { name: string } }>(
      "/api/uploads/:name",
      {
        schema: {
          params: Type.Object({
            name: Type.String({ pattern: "^[0-9a-f-]{36}\\.(jpg|png|webp)$" }),
          }),
        },
      },
      async (request, reply) => {
        const name = request.params.name;
        try {
          await stat(join(options.uploads, name));
        } catch {
          return reply
            .code(404)
            .send({ message: "이미지를 찾을 수 없습니다." });
        }
        reply.type(
          name.endsWith(".jpg")
            ? "image/jpeg"
            : name.endsWith(".png")
              ? "image/png"
              : "image/webp",
        );
        return reply.send(createReadStream(join(options.uploads, name)));
      },
    );
  });
}
