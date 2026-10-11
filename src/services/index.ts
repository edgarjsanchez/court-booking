// The ONE place that decides which implementations the app uses.
//
// No .env → demo mode: data in this browser, pick a sample player.
// VITE_NEON_AUTH_URL set → real accounts with Neon Auth + the API server and Neon database.
import { ApiBookingService } from "./ApiBookingService";
import { LocalBookingService } from "./LocalBookingService";
import { MockAuthService } from "./MockAuthService";
import { NeonAuthService } from "./NeonAuthService";
import type { AuthService, BookingService } from "./types";

// Accept the URL with or without a trailing "/" or "/.well-known/jwks.json".
const neonAuthUrl = (import.meta.env.VITE_NEON_AUTH_URL as string | undefined)
  ?.trim()
  .replace(/\/\.well-known\/jwks\.json\/?$/, "")
  .replace(/\/+$/, "") || undefined;
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

export const authService: AuthService = neonAuthUrl ? new NeonAuthService(neonAuthUrl) : new MockAuthService();
export const bookingService: BookingService = neonAuthUrl
  ? new ApiBookingService(apiUrl, authService)
  : new LocalBookingService();

export type { AuthService, BookingService } from "./types";
