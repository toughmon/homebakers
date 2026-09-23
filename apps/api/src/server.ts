import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { config } from "dotenv";
import Fastify from "fastify";
import { createDatabasePool } from "./database.js";
import { createApp } from "./app.js";
import { CodexCliRunner } from "./harness/codex-runner.js";
import { RunCoordinator } from "./harness/run-coordinator.js";
import { PgGraphRepository } from "./repositories/graph-repository.js";
import { PgRunRepository } from "./repositories/run-repository.js";
import { registerHomebakers } from "./homebakers/routes.js";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const root = fileURLToPath(new URL("../../../", import.meta.url));
const pool = await createDatabasePool(root);
const workspace = resolve(root, process.env.CODEX_WORKSPACE ?? ".");
const runRepository = new PgRunRepository(pool);
const graphEnabled =
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_GRAPH_API !== "false";
const app = graphEnabled
  ? createApp(
      new PgGraphRepository(pool),
      runRepository,
      new RunCoordinator(runRepository, new CodexCliRunner(workspace)),
      workspace,
    )
  : Fastify({ logger: true });
if (!graphEnabled)
  app.get("/api/health", async () => {
    await pool.query("SELECT 1");
    return { status: "ok" };
  });
await registerHomebakers(app, pool, {
  origin: process.env.APP_ORIGIN ?? "http://127.0.0.1:5173",
  production: process.env.NODE_ENV === "production",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  uploads: resolve(root, process.env.UPLOAD_DIR ?? "var/uploads"),
});

try {
  await pool.query("SELECT 1");
  if (graphEnabled) await runRepository.interruptActive();
  await app.listen({
    port: Number(process.env.API_PORT ?? 3002),
    host: "127.0.0.1",
  });
} catch (error) {
  app.log.error(error);
  await pool.end();
  process.exitCode = 1;
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
}
