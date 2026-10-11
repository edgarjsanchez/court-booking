// Real sign-in with Neon Auth (managed Better Auth). Users live in your Neon
// database, in the neon_auth schema. Docs: https://neon.com/docs/auth/overview
import { createAuthClient } from "@neondatabase/neon-js/auth";
import type { User } from "../domain/types";
import type { AuthService } from "./types";

// The handful of client methods we use, typed loosely so SDK updates don't break the build.
type Result<T> = { data?: T | null; error?: { message?: string; status?: number; code?: string } | null };
interface RawUser {
  id: string;
  email: string;
  name?: string | null;
  emailVerified?: boolean;
}
interface NeonAuthClient {
  getSession(options?: unknown): Promise<Result<{ user?: RawUser | null; session?: unknown } | null>>;
  signIn: { email(input: { email: string; password: string }): Promise<Result<unknown>> };
  signUp: { email(input: { email: string; password: string; name: string }): Promise<Result<unknown>> };
  signOut(): Promise<unknown>;
  token?(): Promise<Result<{ token?: string }>>;
}

const toUser = (u: RawUser): User => ({
  id: u.id,
  email: u.email,
  name: u.name?.trim() || u.email.split("@")[0],
});

/** Reads the expiry (seconds) out of a JWT without verifying it; the server verifies. */
function expiresAt(jwt: string): number {
  try {
    const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : 0;
  } catch {
    return 0;
  }
}

export class NeonAuthService implements AuthService {
  readonly mode = "neon" as const;
  private client: NeonAuthClient;
  private cached: { token: string; exp: number } | null = null;

  constructor(authUrl: string) {
    this.client = createAuthClient(authUrl) as unknown as NeonAuthClient;
  }

  async currentUser() {
    const { data } = await this.client.getSession();
    return data?.user ? toUser(data.user) : null;
  }

  async signInWithEmail(email: string, password: string) {
    const { error } = await this.client.signIn.email({ email, password });
    if (error) throw new Error(friendly(error.message, "Couldn't sign in. Check your email and password."));
    return this.mustHaveUser();
  }

  async signUp(name: string, email: string, password: string) {
    const { error } = await this.client.signUp.email({ email, password, name });
    if (error) throw new Error(friendly(error.message, "Couldn't create your account."));
    const user = await this.currentUser();
    // If email verification is switched on in Neon, there's no session until they click the link.
    if (!user) throw new Error("Account created. Check your inbox to verify your email, then sign in.");
    return user;
  }

  async signOut() {
    this.cached = null;
    await this.client.signOut();
  }

  /**
   * A JWT for our API. The Neon client puts it in session.token whenever it
   * fetches the session (from the "set-auth-jwt" response header), the same
   * way the SDK's own getJWTToken() does. Tokens last ~15 minutes, so we reuse
   * one until it's nearly expired.
   */
  async getToken() {
    const now = Date.now() / 1000;
    if (this.cached && this.cached.exp - now > 60) return this.cached.token;
    this.cached = null;

    const fromSession = async (forceFetch: boolean) => {
      try {
        const { data } = await this.client.getSession(
          forceFetch ? { fetchOptions: { headers: { "X-Force-Fetch": "true" } } } : undefined,
        );
        const token = (data?.session as { token?: unknown } | null | undefined)?.token;
        return isFreshJwt(token, now) ? token : null;
      } catch {
        return null;
      }
    };

    // 1) cached session, 2) fresh session from Neon (bypasses the client's cache), 3) /token endpoint.
    let token = (await fromSession(false)) ?? (await fromSession(true));
    if (!token && this.client.token) {
      try {
        const { data } = await this.client.token();
        if (isFreshJwt(data?.token, now)) token = data!.token!;
      } catch {
        /* not signed in */
      }
    }
    if (token) this.cached = { token, exp: expiresAt(token) };
    return token;
  }

  /** Forget the cached token (e.g. the server rejected it). */
  clearToken() {
    this.cached = null;
  }

  private async mustHaveUser() {
    const user = await this.currentUser();
    if (!user) throw new Error("Signed in, but no session was created. Please try again.");
    return user;
  }
}

function isFreshJwt(value: unknown, now: number): value is string {
  return typeof value === "string" && value.split(".").length === 3 && expiresAt(value) - now > 30;
}

function friendly(message: string | undefined, fallback: string) {
  return message && message.length < 200 ? message : fallback;
}
