// Checks the Neon Auth token sent by the browser ("Authorization: Bearer <jwt>").
// Neon Auth signs tokens with keys published at <NEON_AUTH_URL>/.well-known/jwks.json.
import type { IncomingMessage } from "node:http";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "./env.js";
import { HttpError } from "./http.js";

const jwks = createRemoteJWKSet(new URL(`${env.NEON_AUTH_URL}/.well-known/jwks.json`));
const issuer = new URL(env.NEON_AUTH_URL).origin;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/** Returns the signed-in user, or null if no token was sent. Throws 401 for a bad/expired token. */
export async function optionalUser(req: IncomingMessage): Promise<AuthUser | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), jwks, { issuer });
    if (!payload.sub) throw new Error("Token has no subject");
    return {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : "",
      name: typeof payload.name === "string" ? payload.name : "",
    };
  } catch {
    throw new HttpError(401, "NOT_SIGNED_IN", "Your session has expired. Please sign in again.");
  }
}

export async function requireUser(req: IncomingMessage): Promise<AuthUser> {
  const user = await optionalUser(req);
  if (!user) throw new HttpError(401, "NOT_SIGNED_IN", "Please sign in first.");
  return user;
}
