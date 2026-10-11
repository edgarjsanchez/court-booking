// The app talks to these interfaces only. services/index.ts picks the
// implementations: local demo versions, or Neon-backed ones when configured.
import type { Booking, Court, DateKey, Facility, NewBooking, Slot, User } from "../domain/types";

export interface BookingService {
  getFacility(): Promise<Facility>;
  listCourts(): Promise<Court[]>;
  /** viewerId marks your own bookings as "mine" (the API uses your token instead). */
  getAvailability(date: DateKey, viewerId: string | null): Promise<Slot[]>;
  createBooking(input: NewBooking): Promise<Booking>;
  cancelBooking(bookingId: string, userId: string): Promise<void>;
  listMyBookings(userId: string): Promise<Booking[]>;
  /** Fires when data may have changed elsewhere (another tab, another player). */
  subscribe(onChange: () => void): () => void;
  /** Demo only: wipe and re-seed local data. */
  reset?(): void;
}

export interface AuthService {
  /** "demo" = pick a sample player; "neon" = real email + password accounts. */
  readonly mode: "demo" | "neon";
  currentUser(): Promise<User | null>;
  signOut(): Promise<void>;
  /** Short-lived token to send to the API, or null when signed out. */
  getToken(): Promise<string | null>;
  /** Drop any cached token so the next getToken() fetches a new one. */
  clearToken?(): void;

  // Real accounts
  signInWithEmail?(email: string, password: string): Promise<User>;
  signUp?(name: string, email: string, password: string): Promise<User>;

  // Demo players
  signInAsDemoUser?(userId: string): Promise<User>;
  listDemoUsers?(): Promise<User[]>;
}
