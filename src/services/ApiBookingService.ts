// Talks to our API server (server/), which stores everything in Neon Postgres.
import { BookingError, type Booking, type BookingErrorCode, type Court, type Facility, type NewBooking, type Slot } from "../domain/types";
import type { AuthService, BookingService } from "./types";

export class ApiBookingService implements BookingService {
  private courts: Promise<Court[]> | null = null;
  private facility: Promise<Facility> | null = null;

  constructor(
    private baseUrl: string,
    private auth: AuthService,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown, retried = false): Promise<T> {
    const headers: Record<string, string> = {};
    const token = await this.auth.getToken().catch(() => null);
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers["content-type"] = "application/json";

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new Error("Can't reach the booking server. Is `npm run dev` running?");
    }
    const data = await res.json().catch(() => null);
    // Token expired or was refused: get a fresh one and try once more.
    if (res.status === 401 && !retried && this.auth.clearToken) {
      this.auth.clearToken();
      return this.request<T>(method, path, body, true);
    }
    if (!res.ok) {
      const message = data?.message ?? `Request failed (${res.status}).`;
      throw data?.code ? new BookingError(data.code as BookingErrorCode, message) : new Error(message);
    }
    return data as T;
  }

  getFacility() {
    this.facility ??= this.request<Facility>("GET", "/facility").catch((e) => {
      this.facility = null;
      throw e;
    });
    return this.facility;
  }

  listCourts() {
    this.courts ??= this.request<Court[]>("GET", "/courts").catch((e) => {
      this.courts = null;
      throw e;
    });
    return this.courts;
  }

  getAvailability(date: string) {
    return this.request<Slot[]>("GET", `/availability?date=${encodeURIComponent(date)}`);
  }

  createBooking({ courtId, start, hours }: NewBooking) {
    // The server takes the player from the token, never from the request body.
    return this.request<Booking>("POST", "/bookings", { courtId, start, hours });
  }

  async cancelBooking(bookingId: string) {
    await this.request("POST", `/bookings/${encodeURIComponent(bookingId)}/cancel`);
  }

  listMyBookings() {
    return this.request<Booking[]>("GET", "/bookings/mine");
  }

  /** Other players book too: refresh every 30s and whenever you come back to the tab. */
  subscribe(onChange: () => void) {
    const timer = window.setInterval(onChange, 30_000);
    const onVisible = () => document.visibilityState === "visible" && onChange();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }
}
