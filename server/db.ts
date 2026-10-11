import { neon } from "@neondatabase/serverless";
import { env } from "./env";

// Neon's serverless driver sends each query over HTTPS: no connection pool to manage.
const sql = neon(env.DATABASE_URL);

/** Run one parameterized query ($1, $2, …) and return its rows. */
export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await sql.query(text, params)) as T[];
}
