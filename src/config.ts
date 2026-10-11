import { nowInTimeZone } from "./domain/time.js";
import type { BookingRules } from "./domain/types.js";

/** Club rules. Edit these to change how booking works. Used by the app AND the server. */
export const RULES: BookingRules = {
  openHour: 7, // 7 AM
  closeHour: 22, // 10 PM
  maxHours: 2,
  daysAhead: 7,
  maxActivePerUser: 3,
};

/** The club's time zone. All booking times are wall-clock times at the club. */
export const FACILITY_TIMEZONE = "America/Bogota";

/** "Now" at the club, regardless of where the browser or server is. */
export const facilityNow = () => nowInTimeZone(FACILITY_TIMEZONE);

/** Fake network delay for the local demo services, so loading states are visible. */
export const FAKE_LATENCY_MS = 250;
