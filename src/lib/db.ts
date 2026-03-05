import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!globalThis._pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    globalThis._pgPool = new Pool({
      connectionString,
      max: 10,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
    });
  }
  return globalThis._pgPool;
}

import type { QueryResultRow } from "pg";

export const db = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ) => getPool().query<T>(text, values),
};
