// Pure booking rules. No storage, no UI — easy to test and to reuse on a server.
import { addHours, atHour, dateOf, daysBetween, hourOf, overlaps, toDateKey, toLocalDateTime } from "./time.js";
import type { Booking, BookingErrorCode, BookingRules, Court, DateKey, NewBooking, Slot } from "./types.js";

export type RuleResult = { ok: true } | { ok: false; code: BookingErrorCode; message: string };

const fail = (code: BookingErrorCode, message: string): RuleResult => ({ ok: false, code, message });

export interface RuleContext {
  courts: Court[];
  bookings: Booking[];
  rules: BookingRules;
  now: Date;
}

export function isUpcoming(b: Booking, now: Date): boolean {
  return b.status === "confirmed" && b.end > toLocalDateTime(now);
}

export function checkNewBooking(req: NewBooking, ctx: RuleContext): RuleResult {
  const { courts, bookings, rules, now } = ctx;
  if (!req.userId) return fail("NOT_SIGNED_IN", "Please sign in to book a court.");
  if (!courts.some((c) => c.id === req.courtId)) return fail("UNKNOWN_COURT", "That court doesn't exist.");

  if (!Number.isInteger(req.hours) || req.hours < 1) return fail("TOO_LONG", "Bookings must be at least 1 hour.");
  if (req.hours > rules.maxHours) {
    return fail("TOO_LONG", `Bookings can be at most ${rules.maxHours} hour${rules.maxHours === 1 ? "" : "s"}.`);
  }

  const start = req.start;
  const end = addHours(start, req.hours);
  const startHour = hourOf(start);
  if (!start.endsWith(":00") || startHour < rules.openHour || startHour + req.hours > rules.closeHour) {
    return fail("OUTSIDE_HOURS", "That time is outside opening hours.");
  }

  if (start < toLocalDateTime(now)) return fail("IN_THE_PAST", "That time has already passed.");

  if (daysBetween(toDateKey(now), dateOf(start)) > rules.daysAhead) {
    return fail("TOO_FAR_AHEAD", `You can book up to ${rules.daysAhead} days ahead.`);
  }

  const active = bookings.filter((b) => b.status === "confirmed");

  if (active.some((b) => b.courtId === req.courtId && overlaps(start, end, b.start, b.end))) {
    return fail("SLOT_TAKEN", "Sorry, someone just booked that time. Please pick another slot.");
  }

  const mine = active.filter((b) => b.userId === req.userId);
  if (mine.some((b) => overlaps(start, end, b.start, b.end))) {
    return fail("USER_OVERLAP", "You already have a court booked at that time.");
  }

  const upcomingCount = mine.filter((b) => isUpcoming(b, now)).length;
  if (upcomingCount >= rules.maxActivePerUser) {
    return fail("LIMIT_REACHED", `You can have up to ${rules.maxActivePerUser} upcoming bookings. Cancel one to book another.`);
  }

  return { ok: true };
}

/** Builds the grid for one day: one slot per court per hour. */
export function buildDaySlots(date: DateKey, ctx: RuleContext, viewerId: string | null): Slot[] {
  const { courts, bookings, rules, now } = ctx;
  const nowStr = toLocalDateTime(now);
  const active = bookings.filter((b) => b.status === "confirmed" && dateOf(b.start) === date);
  const slots: Slot[] = [];

  for (const court of courts) {
    for (let h = rules.openHour; h < rules.closeHour; h++) {
      const start = atHour(date, h);
      const end = addHours(start, 1);
      const booking = active.find((b) => b.courtId === court.id && overlaps(start, end, b.start, b.end));
      let status: Slot["status"] = "open";
      if (booking) status = booking.userId === viewerId ? "mine" : "booked";
      else if (start < nowStr) status = "past";
      slots.push({ courtId: court.id, start, end, status, bookingId: booking?.id });
    }
  }
  return slots;
}

/** Which durations (in hours) are bookable starting at this slot. */
export function allowedDurations(courtId: string, start: string, slots: Slot[], rules: BookingRules): number[] {
  const result: number[] = [];
  for (let h = 1; h <= rules.maxHours; h++) {
    const needed = Array.from({ length: h }, (_, i) => addHours(start, i));
    const allOpen = needed.every((s) => slots.find((x) => x.courtId === courtId && x.start === s)?.status === "open");
    if (!allOpen) break;
    result.push(h);
  }
  return result;
}
