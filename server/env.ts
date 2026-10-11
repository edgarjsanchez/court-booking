import "dotenv/config";

/** Server settings, read from the .env file in the project folder. */
export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  NEON_AUTH_URL: (process.env.NEON_AUTH_URL ?? process.env.VITE_NEON_AUTH_URL ?? "").replace(/\/\.well-known\/jwks\.json\/?$/, "") // accept the JWKS link by mistake
    .replace(/\/+$/, ""),
  PORT: Number(process.env.API_PORT ?? 8787),
};

export function missingEnv(): string[] {
  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.NEON_AUTH_URL) missing.push("NEON_AUTH_URL");
  return missing;
}
