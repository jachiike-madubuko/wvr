import { Client, Pool, type PoolClient } from "pg";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db.ts is server-only");
}

declare global {
  var __weavrPool: Pool | undefined;
}

function getPool(): Pool {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!globalThis.__weavrPool) {
    globalThis.__weavrPool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalThis.__weavrPool;
}

/** Runs `fn` inside a transaction with `app.teacher_id` set transaction-locally for RLS. */
export async function withTeacherDb<T>(
  fn: (client: PoolClient) => Promise<T>,
  teacherId?: string,
): Promise<T> {
  const id = (teacherId ?? process.env.DEMO_TEACHER_ID)?.trim();
  if (!id) {
    throw new Error("DEMO_TEACHER_ID is required for teacher DB access");
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.teacher_id', $1, true)", [id]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Runs `fn` without setting `app.teacher_id`, so RLS blocks direct table access and only capability-link SECURITY DEFINER RPCs work. */
export async function withAnonDb<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Server-only unpooled transaction for demo seed/reset/purge routes.
 * Enforces direct Neon URL (never -pooler) so prepared statements and
 * transactional swaps stay atomic without PgBouncer session drift.
 */
export async function withUnpooledAdminDb<T>(
  fn: (client: Client) => Promise<T>,
  directUrl: string,
): Promise<T> {
  if (/-pooler\./i.test(directUrl)) {
    throw new Error("Refusing admin seed over a pooled (-pooler) Neon URL");
  }
  const client = new Client({ connectionString: directUrl });
  await client.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}
