import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import { createDatabasePool } from "./database.js";

test("embedded database preserves rows across restart and reports SELECT row counts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "homebakers-db-test-"));
  vi.stubEnv("DATABASE_MODE", "embedded");
  vi.stubEnv("LOCAL_DB_DIR", directory);
  let pool = await createDatabasePool(directory);
  try {
    await pool.query("CREATE TABLE migration_test (name text PRIMARY KEY)");
    const inserted = await pool.query(
      "INSERT INTO migration_test VALUES ($1)",
      ["001.sql"],
    );
    expect(inserted.rowCount).toBe(1);
    await pool.end();
    pool = await createDatabasePool(directory);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        "SELECT 1 FROM migration_test WHERE name = $1",
        ["001.sql"],
      );
      expect(existing.rowCount).toBe(1);
      expect(existing.rows).toHaveLength(1);
      const missing = await client.query(
        "SELECT 1 FROM migration_test WHERE name = $1",
        ["missing.sql"],
      );
      expect(missing.rowCount).toBe(0);
      await client.query("COMMIT");
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
    vi.unstubAllEnvs();
    await rm(directory, { recursive: true, force: true });
  }
});
