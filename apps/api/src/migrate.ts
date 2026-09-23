import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createDatabasePool } from "./database.js";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const directory = fileURLToPath(
  new URL("../../../db/migrations/", import.meta.url),
);
const pool = await createDatabasePool(
  fileURLToPath(new URL("../../../", import.meta.url)),
);

try {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [file],
      );
      if (existing.rowCount === 0) {
        await client.query(
          await readFile(
            fileURLToPath(
              new URL(`../../../db/migrations/${file}`, import.meta.url),
            ),
            "utf8",
          ),
        );
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [
          file,
        ]);
        console.log(`Applied ${file}`);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  console.log("Database is up to date.");
} finally {
  await pool.end();
}
