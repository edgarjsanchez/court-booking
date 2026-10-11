import { FAKE_LATENCY_MS, RULES, facilityNow } from "../config";
import { buildDaySlots, checkNewBooking, type RuleContext } from "../domain/rules";
import { addHours } from "../domain/time";
import { BookingError, type Booking, type NewBooking } from "../domain/types";
import { COURTS, FACILITY, seedBookings } from "../seed";
import { delay, readJSON, removeKey, writeJSON } from "./storage";
import type { BookingService } from "./types";

const KEY = "court-booking.bookings.v1";

/** Stores bookings in this browser's localStorage. Stand-in for a real API. */
export class LocalBookingService implements BookingService {
  private load(): Booking[] {
    const existing = readJSON<Booking[] | null>(KEY, null);
    if (existing) return existing;
    const seeded = seedBookings(facilityNow());
    writeJSON(KEY, seeded);
    return seeded;
  }

  private ctx(): RuleContext {
    return { courts: COURTS, bookings: this.load(), rules: RULES, now: facilityNow() };
  }

  async getFacility() {
    await delay(FAKE_LATENCY_MS);
    return FACILITY;
  }

  async listCourts() {
    await delay(FAKE_LATENCY_MS);
    return COURTS;
  }

  async getAvailability(date: string, viewerId: string | null) {
    await delay(FAKE_LATENCY_MS);
    return buildDaySlots(date, this.ctx(), viewerId);
  }

  async createBooking(input: NewBooking) {
    await delay(FAKE_LATENCY_MS);
    // Re-check against the latest data, like a server would.
    const ctx = this.ctx();
    const result = checkNewBooking(input, ctx);
    if (!result.ok) throw new BookingError(result.code, result.message);

    const booking: Booking = {
      id: crypto.randomUUID(),
      courtId: input.courtId,
      userId: input.userId,
      start: input.start,
      end: addHours(input.start, input.hours),
      status: "confirmed",
      createdAt: new Date().toISOString(),
    };
    writeJSON(KEY, [...ctx.bookings, booking]);
    return booking;
  }

  async cancelBooking(bookingId: string, userId: string) {
    await delay(FAKE_LATENCY_MS);
    const bookings = this.load();
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) throw new BookingError("NOT_FOUND", "That booking no longer exists.");
    if (b.userId !== userId) throw new BookingError("FORBIDDEN", "You can only cancel your own bookings.");
    writeJSON(KEY, bookings.map((x) => (x.id === bookingId ? { ...x, status: "cancelled" as const } : x)));
  }

  async listMyBookings(userId: string) {
    await delay(FAKE_LATENCY_MS);
    return this.load()
      .filter((b) => b.userId === userId)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  subscribe(onChange: () => void) {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) onChange();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }

  /** Demo helper: wipe bookings and re-seed. */
  reset() {
    removeKey(KEY);
  }
}
