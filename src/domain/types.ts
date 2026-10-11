// Core data model. These shapes map 1:1 to database tables later.

/** Local date-time without timezone, e.g. "2026-10-11T07:00". */
export type LocalDateTime = string;
/** Local date, e.g. "2026-10-11". */
export type DateKey = string;

export type Surface = "hard" | "clay" | "grass";

export interface Facility {
  id: string;
  name: string;
  address: string;
}

export interface Court {
  id: string;
  facilityId: string;
  name: string;
  surface: Surface;
  indoor: boolean;
  hasLights: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface Booking {
  id: string;
  courtId: string;
  userId: string;
  start: LocalDateTime;
  end: LocalDateTime;
  status: BookingStatus;
  createdAt: string; // ISO timestamp
}

export interface NewBooking {
  courtId: string;
  userId: string;
  start: LocalDateTime;
  hours: number;
}

export type SlotStatus = "open" | "booked" | "mine" | "past";

export interface Slot {
  courtId: string;
  start: LocalDateTime;
  end: LocalDateTime;
  status: SlotStatus;
  bookingId?: string;
}

export interface BookingRules {
  openHour: number; // first slot starts at this hour
  closeHour: number; // last slot ends at this hour
  maxHours: number; // longest single booking
  daysAhead: number; // how far ahead people can book (0 = today only)
  maxActivePerUser: number; // upcoming confirmed bookings per user
}

export type BookingErrorCode =
  | "NOT_SIGNED_IN"
  | "UNKNOWN_COURT"
  | "OUTSIDE_HOURS"
  | "IN_THE_PAST"
  | "TOO_FAR_AHEAD"
  | "TOO_LONG"
  | "SLOT_TAKEN"
  | "USER_OVERLAP"
  | "LIMIT_REACHED"
  | "NOT_FOUND"
  | "FORBIDDEN";

export class BookingError extends Error {
  constructor(
    public code: BookingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BookingError";
  }
}
