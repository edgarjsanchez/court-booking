import { describe, expect, it } from "vitest";
import { allowedDurations, buildDaySlots, checkNewBooking, type RuleContext } from "./rules";
import { nowInTimeZone } from "./time";
import type { Booking, BookingRules, Court } from "./types";

const rules: BookingRules = { openHour: 7, closeHour: 22, maxHours: 2, daysAhead: 7, maxActivePerUser: 3 };
const courts: Court[] = [
  { id: "c1", facilityId: "f1", name: "Court 1", surface: "hard", indoor: false, hasLights: true },
  { id: "c2", facilityId: "f1", name: "Court 2", surface: "clay", indoor: false, hasLights: false },
];
// "Now" is 10:30 on Oct 11, 2026 (local time).
const now = new Date(2026, 9, 11, 10, 30);

const booking = (over: Partial<Booking>): Booking => ({
  id: Math.random().toString(36).slice(2),
  courtId: "c1",
  userId: "u2",
  start: "2026-10-11T14:00",
  end: "2026-10-11T15:00",
  status: "confirmed",
  createdAt: now.toISOString(),
  ...over,
});

const ctx = (bookings: Booking[] = []): RuleContext => ({ courts, bookings, rules, now });

describe("checkNewBooking", () => {
  const base = { courtId: "c1", userId: "u1", start: "2026-10-11T14:00", hours: 1 };

  it("accepts a valid booking", () => {
    expect(checkNewBooking(base, ctx())).toEqual({ ok: true });
  });

  it("rejects when signed out", () => {
    expect(checkNewBooking({ ...base, userId: "" }, ctx())).toMatchObject({ ok: false, code: "NOT_SIGNED_IN" });
  });

  it("rejects an unknown court", () => {
    expect(checkNewBooking({ ...base, courtId: "nope" }, ctx())).toMatchObject({ code: "UNKNOWN_COURT" });
  });

  it("rejects double bookings on the same court", () => {
    const res = checkNewBooking(base, ctx([booking({})]));
    expect(res).toMatchObject({ ok: false, code: "SLOT_TAKEN" });
  });

  it("rejects a 2-hour booking that runs into someone else's slot", () => {
    const res = checkNewBooking({ ...base, start: "2026-10-11T13:00", hours: 2 }, ctx([booking({})]));
    expect(res).toMatchObject({ code: "SLOT_TAKEN" });
  });

  it("ignores cancelled bookings", () => {
    expect(checkNewBooking(base, ctx([booking({ status: "cancelled" })]))).toEqual({ ok: true });
  });

  it("allows back-to-back bookings", () => {
    expect(checkNewBooking({ ...base, start: "2026-10-11T15:00" }, ctx([booking({})]))).toEqual({ ok: true });
  });

  it("rejects times in the past", () => {
    expect(checkNewBooking({ ...base, start: "2026-10-11T09:00" }, ctx())).toMatchObject({ code: "IN_THE_PAST" });
  });

  it("rejects times outside opening hours", () => {
    expect(checkNewBooking({ ...base, start: "2026-10-12T06:00" }, ctx())).toMatchObject({ code: "OUTSIDE_HOURS" });
    expect(checkNewBooking({ ...base, start: "2026-10-12T21:00", hours: 2 }, ctx())).toMatchObject({ code: "OUTSIDE_HOURS" });
    expect(checkNewBooking({ ...base, start: "2026-10-12T21:00", hours: 1 }, ctx())).toEqual({ ok: true });
  });

  it("rejects bookings too far ahead", () => {
    expect(checkNewBooking({ ...base, start: "2026-10-18T10:00" }, ctx())).toEqual({ ok: true });
    expect(checkNewBooking({ ...base, start: "2026-10-19T10:00" }, ctx())).toMatchObject({ code: "TOO_FAR_AHEAD" });
  });

  it("rejects bookings longer than the max", () => {
    expect(checkNewBooking({ ...base, hours: 3 }, ctx())).toMatchObject({ code: "TOO_LONG" });
  });

  it("stops a user booking two courts at the same time", () => {
    const mine = booking({ userId: "u1", courtId: "c2" });
    expect(checkNewBooking(base, ctx([mine]))).toMatchObject({ code: "USER_OVERLAP" });
  });

  it("enforces the upcoming-bookings limit, ignoring past ones", () => {
    const three = ["2026-10-12", "2026-10-13", "2026-10-14"].map((d) =>
      booking({ userId: "u1", start: `${d}T08:00`, end: `${d}T09:00` }),
    );
    expect(checkNewBooking(base, ctx(three))).toMatchObject({ code: "LIMIT_REACHED" });

    const past = booking({ userId: "u1", start: "2026-10-10T08:00", end: "2026-10-10T09:00" });
    expect(checkNewBooking(base, ctx([...three.slice(0, 2), past]))).toEqual({ ok: true });
  });
});

describe("buildDaySlots", () => {
  it("marks open, booked, mine and past slots", () => {
    const bookings = [booking({}), booking({ userId: "u1", courtId: "c2", start: "2026-10-11T16:00", end: "2026-10-11T18:00" })];
    const slots = buildDaySlots("2026-10-11", ctx(bookings), "u1");
    const at = (court: string, time: string) => slots.find((s) => s.courtId === court && s.start === `2026-10-11T${time}`)?.status;

    expect(slots).toHaveLength(2 * 15);
    expect(at("c1", "07:00")).toBe("past");
    expect(at("c1", "11:00")).toBe("open");
    expect(at("c1", "14:00")).toBe("booked");
    expect(at("c2", "16:00")).toBe("mine");
    expect(at("c2", "17:00")).toBe("mine");
  });
});

describe("allowedDurations", () => {
  it("only offers 2 hours when the next slot is free too", () => {
    const slots = buildDaySlots("2026-10-11", ctx([booking({})]), "u1");
    expect(allowedDurations("c1", "2026-10-11T12:00", slots, rules)).toEqual([1, 2]);
    expect(allowedDurations("c1", "2026-10-11T13:00", slots, rules)).toEqual([1]);
    expect(allowedDurations("c1", "2026-10-11T21:00", slots, rules)).toEqual([1]);
  });
});

describe("nowInTimeZone", () => {
  it("gives the club's wall-clock time wherever the code runs", () => {
    // 2026-10-11 20:30 UTC is 3:30 PM in Bogotá (UTC-5) and 10:30 PM in Madrid (UTC+2).
    const instant = new Date(Date.UTC(2026, 9, 11, 20, 30));
    const bogota = nowInTimeZone("America/Bogota", instant);
    const madrid = nowInTimeZone("Europe/Madrid", instant);
    expect([bogota.getDate(), bogota.getHours(), bogota.getMinutes()]).toEqual([11, 15, 30]);
    expect([madrid.getDate(), madrid.getHours()]).toEqual([11, 22]);
  });
});
