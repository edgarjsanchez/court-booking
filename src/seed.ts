import { addDays, atHour, addHours, toDateKey } from "./domain/time";
import type { Booking, Court, Facility, User } from "./domain/types";

export const FACILITY: Facility = {
  id: "riverside",
  name: "Riverside Tennis Center",
  address: "200 Park Avenue",
};

export const COURTS: Court[] = [
  { id: "c1", facilityId: "riverside", name: "Court 1", surface: "hard", indoor: false, hasLights: true },
  { id: "c2", facilityId: "riverside", name: "Court 2", surface: "hard", indoor: false, hasLights: true },
  { id: "c3", facilityId: "riverside", name: "Court 3", surface: "clay", indoor: false, hasLights: false },
  { id: "c4", facilityId: "riverside", name: "Court 4", surface: "clay", indoor: false, hasLights: false },
  { id: "c5", facilityId: "riverside", name: "Court 5", surface: "hard", indoor: true, hasLights: true },
  { id: "c6", facilityId: "riverside", name: "Court 6", surface: "hard", indoor: true, hasLights: true },
];

export const DEMO_USERS: User[] = [
  { id: "u1", name: "Alex Rivera", email: "alex@example.com" },
  { id: "u2", name: "Sam Okafor", email: "sam@example.com" },
  { id: "u3", name: "Jordan Lee", email: "jordan@example.com" },
];

/** A few bookings by other players so the grid isn't empty on first run. */
export function seedBookings(now: Date): Booking[] {
  const today = toDateKey(now);
  const plan: [number, string, string, number, number][] = [
    // [dayOffset, courtId, userId, startHour, hours]
    [0, "c1", "u2", 18, 2],
    [0, "c3", "u3", 9, 1],
    [0, "c5", "u2", 12, 1],
    [0, "c6", "u3", 19, 2],
    [1, "c1", "u3", 8, 2],
    [1, "c2", "u2", 17, 1],
    [1, "c4", "u3", 10, 1],
    [2, "c5", "u2", 7, 2],
    [3, "c3", "u3", 16, 2],
  ];
  return plan.map(([offset, courtId, userId, hour, hours], i) => {
    const start = atHour(addDays(today, offset), hour);
    return {
      id: `seed-${i}`,
      courtId,
      userId,
      start,
      end: addHours(start, hours),
      status: "confirmed",
      createdAt: now.toISOString(),
    };
  });
}
