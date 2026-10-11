// The booking API. Every rule is checked here (the browser can't be trusted),
// and the database constraints are the final guard against double bookings.
import type { IncomingMessage, ServerResponse } from "node:http";
import { RULES, facilityNow } from "../src/config";
import { buildDaySlots, checkNewBooking } from "../src/domain/rules";
import { addDays, addHours, toLocalDateTime } from "../src/domain/time";
import { BookingError, type Booking, type BookingErrorCode, type Court, type Facility } from "../src/domain/types";
import { optionalUser, requireUser } from "./auth";
import { query } from "./db";
import { HttpError, readJson, sendJson } from "./http";

const BOOKING_COLUMNS = `
  id::text as id,
  court_id as "courtId",
  user_id as "userId",
  to_char(start_at, 'YYYY-MM-DD"T"HH24:MI') as start,
  to_char(end_at, 'YYYY-MM-DD"T"HH24:MI') as "end",
  status,
  to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:00$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_FOR: Partial<Record<BookingErrorCode, number>> = {
  NOT_SIGNED_IN: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SLOT_TAKEN: 409,
  USER_OVERLAP: 409,
  LIMIT_REACHED: 409,
};

async function listCourts(): Promise<Court[]> {
  return query<Court>(
    `select id, facility_id as "facilityId", name, surface, indoor, has_lights as "hasLights"
     from courts order by sort_order, name`,
  );
}

async function getFacility(): Promise<Facility> {
  const [f] = await query<Facility>(`select id, name, address from facilities order by id limit 1`);
  if (!f) throw new HttpError(503, "NOT_SET_UP", "The database has no facility yet. Run `npm run db:setup`.");
  return f;
}

async function availability(req: IncomingMessage, url: URL) {
  const date = url.searchParams.get("date") ?? "";
  if (!DATE_RE.test(date)) throw new HttpError(400, "BAD_DATE", "Use ?date=YYYY-MM-DD.");
  const user = await optionalUser(req);
  const [courts, bookings] = await Promise.all([
    listCourts(),
    query<Booking>(
      `select ${BOOKING_COLUMNS} from bookings
       where status = 'confirmed' and start_at < $2::timestamp and end_at > $1::timestamp`,
      [`${date}T00:00`, `${addDays(date, 1)}T00:00`],
    ),
  ]);
  // Slots only say open/booked/mine: other players' identities are never sent.
  return buildDaySlots(date, { courts, bookings, rules: RULES, now: facilityNow() }, user?.id ?? null);
}

async function myBookings(req: IncomingMessage) {
  const user = await requireUser(req);
  return query<Booking>(`select ${BOOKING_COLUMNS} from bookings where user_id = $1 order by start_at`, [user.id]);
}

async function createBooking(req: IncomingMessage) {
  const user = await requireUser(req);
  const body = (await readJson(req)) as { courtId?: unknown; start?: unknown; hours?: unknown };
  const courtId = String(body.courtId ?? "");
  const start = String(body.start ?? "");
  const hours = Number(body.hours);
  if (!DATETIME_RE.test(start)) throw new HttpError(400, "BAD_START", "start must look like 2026-10-12T09:00.");

  const end = addHours(start, hours || 1);
  const now = facilityNow();
  const [courts, related] = await Promise.all([
    listCourts(),
    // Just the bookings the rules need: this court around that time, and this player's upcoming ones.
    query<Booking>(
      `select ${BOOKING_COLUMNS} from bookings
       where status = 'confirmed'
         and ((court_id = $1 and start_at < $3::timestamp and end_at > $2::timestamp)
              or (user_id = $4 and end_at > $5::timestamp))`,
      [courtId, start, end, user.id, toLocalDateTime(now)],
    ),
  ]);

  const check = checkNewBooking({ courtId, userId: user.id, start, hours }, { courts, bookings: related, rules: RULES, now });
  if (!check.ok) throw new BookingError(check.code, check.message);

  try {
    const [booking] = await query<Booking>(
      `insert into bookings (court_id, user_id, start_at, end_at)
       values ($1, $2, $3::timestamp, $4::timestamp)
       returning ${BOOKING_COLUMNS}`,
      [courtId, user.id, start, end],
    );
    return booking;
  } catch (e) {
    // Lost a race with another request: the database constraint caught it.
    const err = e as { code?: string; constraint?: string; message?: string };
    if (err.code === "23P01") {
      const mine = (err.constraint ?? err.message ?? "").includes("user_overlap");
      throw mine
        ? new BookingError("USER_OVERLAP", "You already have a court booked at that time.")
        : new BookingError("SLOT_TAKEN", "Sorry, someone just booked that time. Please pick another slot.");
    }
    throw e;
  }
}

async function cancelBooking(req: IncomingMessage, id: string) {
  const user = await requireUser(req);
  if (!UUID_RE.test(id)) throw new BookingError("NOT_FOUND", "That booking no longer exists.");
  const [row] = await query<{ userId: string; status: string; end: string }>(
    `select user_id as "userId", status, to_char(end_at, 'YYYY-MM-DD"T"HH24:MI') as "end" from bookings where id = $1::uuid`,
    [id],
  );
  if (!row) throw new BookingError("NOT_FOUND", "That booking no longer exists.");
  if (row.userId !== user.id) throw new BookingError("FORBIDDEN", "You can only cancel your own bookings.");
  if (row.end <= toLocalDateTime(facilityNow())) throw new HttpError(400, "IN_THE_PAST", "Past bookings can't be cancelled.");
  await query(
    `update bookings set status = 'cancelled', cancelled_at = now() where id = $1::uuid and status = 'confirmed'`,
    [id],
  );
  return { ok: true };
}

export async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname.replace(/\/+$/, "");
  const method = req.method ?? "GET";

  try {
    let result: unknown;
    let m: RegExpMatchArray | null;
    if (method === "GET" && path === "/api/health") result = { ok: true };
    else if (method === "GET" && path === "/api/facility") result = await getFacility();
    else if (method === "GET" && path === "/api/courts") result = await listCourts();
    else if (method === "GET" && path === "/api/availability") result = await availability(req, url);
    else if (method === "GET" && path === "/api/bookings/mine") result = await myBookings(req);
    else if (method === "POST" && path === "/api/bookings") {
      result = await createBooking(req);
      return sendJson(res, 201, result);
    } else if (method === "POST" && (m = path.match(/^\/api\/bookings\/([^/]+)\/cancel$/))) result = await cancelBooking(req, m[1]);
    else throw new HttpError(404, "NOT_FOUND", `No route for ${method} ${path}`);
    sendJson(res, 200, result);
  } catch (e) {
    if (e instanceof BookingError) return sendJson(res, STATUS_FOR[e.code] ?? 422, { code: e.code, message: e.message });
    if (e instanceof HttpError) return sendJson(res, e.status, { code: e.code, message: e.message });
    console.error(`[api] ${method} ${path} failed:`, e);
    sendJson(res, 500, { code: "SERVER_ERROR", message: "Something went wrong on the server." });
  }
}
