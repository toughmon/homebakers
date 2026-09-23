import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import formbody from "@fastify/formbody";
import rateLimit from "@fastify/rate-limit";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createRecipeMcpServer } from "@homebakers/recipe-mcp/server";
import { createHash } from "node:crypto";
import type { Pool } from "pg";
import { digest, token } from "./security.js";

const scope = "recipes:write";
const pkce = (value: string) =>
  createHash("sha256").update(value).digest("base64url");
const validToken = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
const validChallenge = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
const bad = (reply: FastifyReply, message = "잘못된 OAuth 요청입니다.") =>
  reply
    .code(400)
    .send({ error: "invalid_request", error_description: message });

function redirectIsSafe(value: string) {
  try {
    const url = new URL(value);
    return (
      !url.hash &&
      !url.username &&
      !url.password &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}

type Client = { id: string; name: string; redirect_uris: string[] };
type Pending = {
  client_id: string;
  name: string;
  redirect_uri: string;
  code_challenge: string;
  state: string | null;
  resource: string;
};

export async function registerRemoteMcp(
  app: FastifyInstance,
  pool: Pool,
  options: {
    publicUrl: string;
    appOrigin: string;
    internalApiUrl: string | (() => string);
    production: boolean;
  },
) {
  const mcpUrl = new URL(options.publicUrl);
  const appOrigin = new URL(options.appOrigin).origin;
  if (
    mcpUrl.pathname !== "/mcp" ||
    mcpUrl.search ||
    mcpUrl.hash ||
    (options.production &&
      (mcpUrl.protocol !== "https:" || mcpUrl.origin !== appOrigin))
  )
    throw new Error(
      "MCP_PUBLIC_URL은 APP_ORIGIN과 같은 도메인의 공개 HTTPS /mcp 주소여야 합니다.",
    );
  const issuer = mcpUrl.origin;
  const resource = mcpUrl.toString();
  const metadataUrl = `${issuer}/.well-known/oauth-protected-resource`;
  const challenge = `Bearer resource_metadata="${metadataUrl}", error="invalid_token", error_description="Homebakers login required"`;

  await app.register(async (api) => {
    await api.register(cookie);
    await api.register(formbody);
    await api.register(rateLimit, { global: false });
    api.addHook("onSend", async (_request, reply) => {
      reply.header("Cache-Control", "no-store");
      reply.header("X-Content-Type-Options", "nosniff");
    });
    const requireSession = async (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => {
      const value =
        request.cookies[
          options.production ? "__Host-oven-session" : "oven-session"
        ];
      if (!validToken(value))
        return reply.code(401).send({ message: "로그인이 필요합니다." });
      const found = await pool.query<{ user_id: string }>(
        "SELECT user_id FROM baker_sessions WHERE token_hash=$1 AND expires_at>now()",
        [digest(value)],
      );
      if (!found.rows[0])
        return reply.code(401).send({ message: "로그인이 필요합니다." });
      (request as FastifyRequest & { oauthUserId?: string }).oauthUserId =
        found.rows[0].user_id;
    };
    const csrf = async (request: FastifyRequest, reply: FastifyReply) => {
      if (
        request.headers["x-requested-with"] !== "oven-salon" ||
        (request.headers.origin && request.headers.origin !== appOrigin)
      )
        return reply.code(403).send({ message: "허용되지 않은 요청입니다." });
    };

    api.get("/.well-known/oauth-protected-resource", async () => ({
      resource,
      authorization_servers: [issuer],
      scopes_supported: [scope],
      bearer_methods_supported: ["header"],
    }));
    api.get("/.well-known/oauth-protected-resource/mcp", async () => ({
      resource,
      authorization_servers: [issuer],
      scopes_supported: [scope],
      bearer_methods_supported: ["header"],
    }));
    api.get("/.well-known/oauth-authorization-server", async () => ({
      issuer,
      authorization_endpoint: `${issuer}/oauth/authorize`,
      token_endpoint: `${issuer}/oauth/token`,
      registration_endpoint: `${issuer}/oauth/register`,
      revocation_endpoint: `${issuer}/oauth/revoke`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: [scope],
    }));

    api.post(
      "/oauth/register",
      { config: { rateLimit: { max: 30, timeWindow: "1 hour" } } },
      async (request, reply) => {
        const body = request.body as Record<string, unknown> | null;
        const uris = body?.redirect_uris;
        if (
          !body ||
          typeof body.client_name !== "string" ||
          body.client_name.length < 1 ||
          body.client_name.length > 100 ||
          !Array.isArray(uris) ||
          uris.length < 1 ||
          uris.length > 10 ||
          !uris.every(
            (uri) =>
              typeof uri === "string" &&
              uri.length <= 2048 &&
              redirectIsSafe(uri),
          ) ||
          (body.token_endpoint_auth_method &&
            body.token_endpoint_auth_method !== "none")
        )
          return bad(
            reply,
            "클라이언트 이름과 안전한 redirect_uris가 필요합니다.",
          );
        const saved = await pool.query<Client>(
          "INSERT INTO baker_oauth_clients(name,redirect_uris) VALUES($1,$2::jsonb) RETURNING id,name,redirect_uris",
          [body.client_name, JSON.stringify(uris)],
        );
        return reply.code(201).send({
          client_id: saved.rows[0].id,
          client_name: saved.rows[0].name,
          redirect_uris: saved.rows[0].redirect_uris,
          token_endpoint_auth_method: "none",
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
        });
      },
    );

    api.get("/oauth/authorize", async (request, reply) => {
      const q = request.query as Record<string, unknown>;
      if (
        q.response_type !== "code" ||
        !validId(q.client_id) ||
        typeof q.redirect_uri !== "string" ||
        !validChallenge(q.code_challenge) ||
        q.code_challenge_method !== "S256" ||
        (q.scope !== undefined && q.scope !== scope) ||
        (q.resource !== undefined && q.resource !== resource) ||
        (q.state !== undefined &&
          (typeof q.state !== "string" || q.state.length > 1024))
      )
        return bad(reply);
      const found = await pool.query<Client>(
        "SELECT id,name,redirect_uris FROM baker_oauth_clients WHERE id=$1",
        [q.client_id],
      );
      if (
        !found.rows[0] ||
        !found.rows[0].redirect_uris.includes(q.redirect_uri)
      )
        return bad(reply, "등록되지 않은 리디렉션 주소입니다.");
      const id = token();
      await pool.query(
        "INSERT INTO baker_oauth_pending(id,client_id,redirect_uri,code_challenge,state,resource,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '10 minutes')",
        [
          id,
          q.client_id,
          q.redirect_uri,
          q.code_challenge,
          q.state ?? null,
          resource,
        ],
      );
      return reply.code(303).redirect(`${appOrigin}/#/mcp-connect/${id}`);
    });

    api.get<{ Params: { id: string } }>(
      "/api/oauth/pending/:id",
      { preHandler: requireSession },
      async (request, reply) => {
        if (!validToken(request.params.id)) return bad(reply);
        const found = await pool.query<Pending>(
          "SELECT p.client_id,c.name,p.redirect_uri,p.code_challenge,p.state,p.resource FROM baker_oauth_pending p JOIN baker_oauth_clients c ON c.id=p.client_id WHERE p.id=$1 AND p.expires_at>now()",
          [request.params.id],
        );
        if (!found.rows[0])
          return reply
            .code(404)
            .send({ message: "연결 요청이 만료되었습니다." });
        return { clientName: found.rows[0].name, scope };
      },
    );
    api.post<{ Params: { id: string }; Body: { approve: boolean } }>(
      "/api/oauth/pending/:id",
      { preHandler: [csrf, requireSession] },
      async (request, reply) => {
        if (
          !validToken(request.params.id) ||
          typeof request.body?.approve !== "boolean"
        )
          return bad(reply);
        const found = await pool.query<Pending>(
          "DELETE FROM baker_oauth_pending WHERE id=$1 AND expires_at>now() RETURNING client_id,redirect_uri,code_challenge,state,resource",
          [request.params.id],
        );
        const pending = found.rows[0];
        if (!pending)
          return reply
            .code(404)
            .send({ message: "연결 요청이 만료되었습니다." });
        const redirect = new URL(pending.redirect_uri);
        if (pending.state) redirect.searchParams.set("state", pending.state);
        if (request.body.approve) {
          const code = token();
          await pool.query(
            "INSERT INTO baker_oauth_codes(code_hash,client_id,user_id,redirect_uri,code_challenge,resource,expires_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '5 minutes')",
            [
              digest(code),
              pending.client_id,
              (request as FastifyRequest & { oauthUserId: string }).oauthUserId,
              pending.redirect_uri,
              pending.code_challenge,
              pending.resource,
            ],
          );
          redirect.searchParams.set("code", code);
        } else redirect.searchParams.set("error", "access_denied");
        return { redirectTo: redirect.toString() };
      },
    );

    api.post("/oauth/token", async (request, reply) => {
      const body = request.body as Record<string, unknown> | null;
      if (!body || !validId(body.client_id)) return bad(reply);
      if (body.grant_type === "authorization_code") {
        if (
          !validToken(body.code) ||
          typeof body.redirect_uri !== "string" ||
          typeof body.code_verifier !== "string" ||
          body.code_verifier.length < 43 ||
          body.code_verifier.length > 128
        )
          return bad(reply);
        const found = await pool.query<{
          client_id: string;
          user_id: string;
          redirect_uri: string;
          code_challenge: string;
          resource: string;
        }>(
          "DELETE FROM baker_oauth_codes WHERE code_hash=$1 AND expires_at>now() RETURNING client_id,user_id,redirect_uri,code_challenge,resource",
          [digest(body.code)],
        );
        const code = found.rows[0];
        if (
          !code ||
          code.client_id !== body.client_id ||
          code.redirect_uri !== body.redirect_uri ||
          code.code_challenge !== pkce(body.code_verifier) ||
          (body.resource !== undefined && body.resource !== code.resource)
        )
          return reply.code(400).send({ error: "invalid_grant" });
        const access = token(),
          refresh = token();
        await pool.query(
          "INSERT INTO baker_oauth_grants(client_id,user_id,access_hash,refresh_hash,resource,access_expires_at,refresh_expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '1 hour',now()+interval '30 days')",
          [
            code.client_id,
            code.user_id,
            digest(access),
            digest(refresh),
            code.resource,
          ],
        );
        return {
          access_token: access,
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: refresh,
          scope,
        };
      }
      if (body.grant_type === "refresh_token") {
        if (!validToken(body.refresh_token)) return bad(reply);
        const access = token(),
          refresh = token();
        const updated = await pool.query(
          "UPDATE baker_oauth_grants SET access_hash=$1,refresh_hash=$2,access_expires_at=now()+interval '1 hour',refresh_expires_at=now()+interval '30 days' WHERE refresh_hash=$3 AND client_id=$4 AND refresh_expires_at>now() AND resource=$5 RETURNING id",
          [
            digest(access),
            digest(refresh),
            digest(body.refresh_token),
            body.client_id,
            resource,
          ],
        );
        if (!updated.rowCount)
          return reply.code(400).send({ error: "invalid_grant" });
        return {
          access_token: access,
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: refresh,
          scope,
        };
      }
      return reply.code(400).send({ error: "unsupported_grant_type" });
    });
    api.post("/oauth/revoke", async (request, reply) => {
      const body = request.body as Record<string, unknown> | null;
      if (!body || !validId(body.client_id) || !validToken(body.token))
        return bad(reply);
      await pool.query(
        "DELETE FROM baker_oauth_grants WHERE client_id=$1 AND (access_hash=$2 OR refresh_hash=$2)",
        [body.client_id, digest(body.token)],
      );
      return reply.code(200).send({});
    });

    api.get(
      "/api/oauth/grants",
      { preHandler: requireSession },
      async (request) => {
        const found = await pool.query(
          'SELECT g.id,c.name,g.created_at AS "createdAt",g.refresh_expires_at AS "expiresAt" FROM baker_oauth_grants g JOIN baker_oauth_clients c ON c.id=g.client_id WHERE g.user_id=$1 AND g.refresh_expires_at>now() ORDER BY g.created_at DESC',
          [(request as FastifyRequest & { oauthUserId: string }).oauthUserId],
        );
        return { grants: found.rows };
      },
    );
    api.delete<{ Params: { id: string } }>(
      "/api/oauth/grants/:id",
      { preHandler: [csrf, requireSession] },
      async (request, reply) => {
        if (!validId(request.params.id)) return bad(reply);
        const result = await pool.query(
          "DELETE FROM baker_oauth_grants WHERE id=$1 AND user_id=$2",
          [
            request.params.id,
            (request as FastifyRequest & { oauthUserId: string }).oauthUserId,
          ],
        );
        return result.rowCount
          ? { disconnected: true }
          : reply.code(404).send({ message: "연결을 찾을 수 없습니다." });
      },
    );

    api.route({
      method: ["GET", "POST", "DELETE"],
      url: "/mcp",
      bodyLimit: 8 * 1024 * 1024,
      handler: async (request, reply) => {
        if (request.headers.host !== mcpUrl.host)
          return reply.code(403).send({ error: "forbidden_host" });
        const origin = request.headers.origin;
        if (origin && origin !== appOrigin && origin !== issuer)
          return reply.code(403).send({ error: "forbidden" });
        const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
          request.headers.authorization ?? "",
        );
        if (!match)
          return reply
            .code(401)
            .header("WWW-Authenticate", challenge)
            .send({ error: "unauthorized" });
        const accessHash = digest(match[1]);
        const [oauth, personal] = await Promise.all([
          pool.query(
            "SELECT user_id FROM baker_oauth_grants WHERE access_hash=$1 AND access_expires_at>now() AND resource=$2",
            [accessHash, resource],
          ),
          pool.query(
            "SELECT user_id FROM baker_mcp_connection WHERE token_hash=$1 AND expires_at>now()",
            [accessHash],
          ),
        ]);
        if (!oauth.rows[0] && !personal.rows[0])
          return reply
            .code(401)
            .header("WWW-Authenticate", challenge)
            .send({ error: "unauthorized" });
        const handler = createMcpHandler(
          () =>
            createRecipeMcpServer({
              token: match[1],
              apiUrl:
                typeof options.internalApiUrl === "function"
                  ? options.internalApiUrl()
                  : options.internalApiUrl,
              appUrl: appOrigin,
              remote: true,
            }),
          { responseMode: "json" },
        );
        try {
          const input = new Request(resource, {
            method: request.method,
            headers: request.headers as HeadersInit,
            ...(request.method === "POST"
              ? { body: JSON.stringify(request.body) }
              : {}),
          });
          const output = await handler.fetch(input);
          reply.code(output.status);
          output.headers.forEach((value, key) => {
            if (!["content-length", "transfer-encoding"].includes(key))
              reply.header(key, value);
          });
          return reply.send(await output.text());
        } finally {
          await handler.close();
        }
      },
    });
  });
}
