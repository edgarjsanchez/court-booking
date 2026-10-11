import { DEMO_USERS } from "../seed";
import { delay, readJSON, removeKey, writeJSON } from "./storage";
import type { AuthService } from "./types";

// Stored in localStorage so a refresh keeps you signed in.
const KEY = "court-booking.session.v1";

/** Pretend login: pick a demo player. Used when Neon isn't configured. */
export class MockAuthService implements AuthService {
  readonly mode = "demo" as const;

  async currentUser() {
    const id = readJSON<string | null>(KEY, null);
    return DEMO_USERS.find((u) => u.id === id) ?? null;
  }

  async signInAsDemoUser(userId: string) {
    await delay(100);
    const user = DEMO_USERS.find((u) => u.id === userId);
    if (!user) throw new Error("Unknown user");
    writeJSON(KEY, user.id);
    return user;
  }

  async signOut() {
    removeKey(KEY);
  }

  async getToken() {
    return null; // the local demo service doesn't need one
  }

  async listDemoUsers() {
    return DEMO_USERS;
  }
}
