import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

/**
 * Creates or reuses the singleton PostgreSQL connection pool using the Object Method
 * and Cloud SQL environment variables (SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME).
 */
export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', err => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Executes a database operation inside a PostgreSQL transaction where
 * `app.current_user_uid` is scoped locally (`is_local = true`) so PostgreSQL
 * Row-Level Security (RLS) policies isolate all reads and writes to `ownerUid`.
 */
export async function withRlsContext<T>(
  ownerUid: string,
  operation: (tx: DbTransaction) => Promise<T>
): Promise<T> {
  if (!ownerUid) {
    throw new Error('Authentication context is required for database operations.');
  }

  return await db.transaction(async tx => {
    await tx.execute(sql`SELECT set_config('app.current_user_uid', ${ownerUid}, true)`);
    return await operation(tx);
  });
}
