// Database schema. Run with `npm run db:setup` (safe to run more than once).
//
// Times are stored as `timestamp` (no time zone) holding the club's local
// wall-clock time, e.g. 2026-10-12 09:00 = 9 AM at the club. See FACILITY_TIMEZONE.

export const SCHEMA: string[] = [
  // Needed so the exclusion constraints below can mix "=" and "overlaps".
  `create extension if not exists btree_gist`,

  `create table if not exists facilities (
    id         text primary key,
    name       text not null,
    address    text not null
  )`,

  `create table if not exists courts (
    id          text primary key,
    facility_id text not null references facilities(id),
    name        text not null,
    surface     text not null check (surface in ('hard', 'clay', 'grass')),
    indoor      boolean not null default false,
    has_lights  boolean not null default false,
    sort_order  int not null default 0
  )`,

  `create table if not exists bookings (
    id           uuid primary key default gen_random_uuid(),
    court_id     text not null references courts(id),
    -- The Neon Auth user id (the "sub" in their token; neon_auth.user.id).
    user_id      text not null,
    start_at     timestamp not null,
    end_at       timestamp not null,
    status       text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
    created_at   timestamptz not null default now(),
    cancelled_at timestamptz,
    constraint bookings_end_after_start check (end_at > start_at),
    -- THE double-booking guard: no two confirmed bookings on one court can overlap,
    -- even if two requests arrive at the same instant.
    constraint bookings_no_court_overlap
      exclude using gist (court_id with =, tsrange(start_at, end_at) with &&)
      where (status = 'confirmed'),
    -- A player can't be on two courts at once.
    constraint bookings_no_user_overlap
      exclude using gist (user_id with =, tsrange(start_at, end_at) with &&)
      where (status = 'confirmed')
  )`,

  `create index if not exists bookings_user_start_idx on bookings (user_id, start_at)`,
  `create index if not exists bookings_start_idx on bookings (start_at)`,
];
