import { Pool } from "pg";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";

/** Local PostgreSQL-compatible storage. Production always uses the pg driver. */
export async function createDatabasePool(root: string): Promise<Pool> {
  if (process.env.DATABASE_MODE !== "embedded") {
    if (!process.env.DATABASE_URL)
      throw new Error("DATABASE_URL이 필요합니다.");
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000,
    });
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("운영 환경에서는 PostgreSQL DATABASE_URL을 사용하세요.");
  const { PGlite } = await import("@electric-sql/pglite");
  const directory = resolve(root, process.env.LOCAL_DB_DIR ?? "var/local-db");
  await mkdir(directory, { recursive: true });
  const database = new PGlite(directory);
  await database.waitReady;
  let queue = Promise.resolve();
  async function acquire() {
    const previous = queue;
    let release!: () => void;
    queue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    return release;
  }
  async function query(sql: string, values?: unknown[]) {
    const result = values
      ? await database.query(sql, values)
      : (await database.exec(sql)).at(-1);
    return {
      rows: result?.rows ?? [],
      rowCount: result?.rows.length || result?.affectedRows || 0,
    };
  }
  return {
    query: async (sql: string, values?: unknown[]) => {
      const release = await acquire();
      try {
        return await query(sql, values);
      } finally {
        release();
      }
    },
    connect: async () => {
      const release = await acquire();
      return { query, release };
    },
    end: async () => {
      const release = await acquire();
      try {
        await database.close();
      } finally {
        release();
      }
    },
  } as unknown as Pool;
}
