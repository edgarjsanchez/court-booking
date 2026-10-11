# CourtBook: tennis court booking

Players create an account, pick a court and an hour, and book it. Bookings are
stored in a **Neon Postgres** database, and accounts are handled by **Neon Auth**.

The app runs in two modes:

| | Demo mode | Neon mode |
|---|---|---|
| When | no `.env` file | `.env` filled in |
| Accounts | pick a sample player | real email + password sign-up (Neon Auth) |
| Bookings saved in | this browser only | your Neon database |

## How it fits together

```
Browser (React)  ── sign up / sign in ──▶  Neon Auth  (users live in neon_auth.* tables)
      │                                       │ issues a short-lived token (JWT)
      │  /api/... + "Authorization: Bearer <token>"
      ▼                                       │
API server (server/)  ── checks token against Neon Auth's public keys
      │                  checks the booking rules (src/domain/rules.ts)
      ▼
Neon Postgres  ── refuses overlapping bookings itself (exclusion constraints)
```

The browser never talks to the database directly, and the server decides who
you are from the token, not from anything the browser claims.

## Set up Neon (about 10 minutes, once)

1. **Create a project.** Sign up at [neon.com](https://neon.com) and create a
   project. Pick an **AWS** region close to you, because Neon Auth isn't
   available on Azure regions.
2. **Copy the database connection string.** On the project dashboard, click
   **Connect** and copy the connection string (it starts with `postgresql://`).
3. **Turn on Neon Auth.** In the project sidebar open **Auth**, click
   **Enable Auth**, then copy the **Auth Base URL** from its Configuration tab.
4. **Create your `.env` file** in the project folder:
   ```bash
   copy .env.example .env      # Windows   (macOS/Linux: cp .env.example .env)
   ```
   Open `.env` and paste:
   - the connection string into `DATABASE_URL`
   - the Auth Base URL into **both** `NEON_AUTH_URL` and `VITE_NEON_AUTH_URL`

   `.env` holds your database password. It's already in `.gitignore`, so never
   commit or share it.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
cd C:\atutorial\court-booking
npm install
npm run db:setup   # creates the tables and the 6 courts (safe to re-run)
npm run dev        # starts the API (port 8787) and the app (http://localhost:5173)
npm test           # booking-rule tests
```

Then open the app, click **Sign in → Create account**, and book a court. To see
your data, go to Neon Console → **SQL Editor**:

```sql
select * from neon_auth."user";
select * from bookings order by start_at;
```

### If something goes wrong

- **"Can't reach the booking server"**: the API didn't start. Check the
  terminal: the line starting with `[api]` explains why (usually a missing
  `.env` value).
- **Sign-up works but you're not signed in**: email verification is switched
  on in Neon Auth. Click the link in the email, then sign in. You can change
  this under Auth settings in the Neon Console.
- **Sign-in is blocked from localhost**: check Neon Auth's settings for
  allowed or trusted domains and add `http://localhost:5173`.
- **"The database has no facility yet"**: run `npm run db:setup`.

## Things to try

1. Browse while signed out, then click an open slot. You'll be asked to sign in.
2. Create two accounts: one in a normal window and one in a private window.
   Book a slot in one window and watch it show as **Booked** in the other.
3. **Race test:** open the same slot's dialog in both windows and confirm in
   both. Only one booking wins, and the database guarantees it.
4. Try to book a 4th upcoming slot: you'll hit the limit of 3.

## Project layout

```
server/                 the API (Node, no framework)
  index.ts              starts it; says why if .env is missing
  app.ts                routes + booking logic
  auth.ts               verifies Neon Auth tokens (JWKS)
  db.ts                 Neon serverless driver
  schema.ts             tables + overlap constraints
  setup-db.ts           `npm run db:setup`
src/
  domain/               types, time helpers, booking rules (shared with server) + tests
  services/
    index.ts            picks demo or Neon implementations
    NeonAuthService.ts  sign up / in / out, gets tokens
    ApiBookingService.ts calls the API
    LocalBookingService.ts, MockAuthService.ts   demo mode
  pages/                Book, Courts, My bookings, Sign in
  components/           header, date strip, slot grid, booking dialog
  config.ts             opening hours, limits, club time zone
  seed.ts               the club and courts (and demo-mode sample data)
```

## API

| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | `/api/facility` | – | club name and address |
| GET | `/api/courts` | – | list of courts |
| GET | `/api/availability?date=YYYY-MM-DD` | optional | the day's slots (yours marked "mine") |
| GET | `/api/bookings/mine` | required | your bookings |
| POST | `/api/bookings` | required | `{ courtId, start: "2026-10-12T09:00", hours }` |
| POST | `/api/bookings/:id/cancel` | required | cancel your own upcoming booking |

## Changing things

- **Rules** (hours, max length, days ahead, booking cap): `src/config.ts`. The
  server enforces the same file.
- **Club time zone**: `FACILITY_TIMEZONE` in `src/config.ts` (currently
  `America/Bogota`). All booking times are the club's local time.
- **Courts**: edit `src/seed.ts`, then run `npm run db:setup` again.

## Next steps

- **Deploy**: host the API (for example on Render, Railway or Fly.io) and the
  built app (`npm run build` → `dist/`), then set `VITE_API_URL` to the API's
  address. If they're on different domains, the API will also need CORS
  settings, which it doesn't have yet.
- **Admin screen** to manage courts and hours.
- **Email confirmations** for bookings.
