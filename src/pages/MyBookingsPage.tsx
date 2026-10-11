import { useState } from "react";
import { useAsync } from "../components/useAsync";
import { facilityNow } from "../config";
import { useApp } from "../context/AppContext";
import { isUpcoming } from "../domain/rules";
import { dateOf, formatDate, formatTimeRange } from "../domain/time";
import type { Booking, Court } from "../domain/types";
import { bookingService } from "../services";

export function MyBookingsPage({ onBook, onSignIn }: { onBook: () => void; onSignIn: () => void }) {
  const { user, authMode, dataVersion, refreshData, notify } = useApp();
  const courts = useAsync(() => bookingService.listCourts(), []);
  const bookings = useAsync(
    () => (user ? bookingService.listMyBookings(user.id) : Promise.resolve([])),
    [user?.id, dataVersion],
  );

  if (!user) {
    return (
      <section className="page">
        <h1>My bookings</h1>
        <div className="empty">
          <p>Sign in to see your bookings.</p>
          {authMode === "demo" ? (
            <p className="muted">Choose a demo player in the top-right corner.</p>
          ) : (
            <button className="btn primary" onClick={onSignIn}>Sign in</button>
          )}
        </div>
      </section>
    );
  }

  const now = facilityNow();
  const all = bookings.data ?? [];
  const upcoming = all.filter((b) => isUpcoming(b, now));
  const past = all.filter((b) => !isUpcoming(b, now)).reverse();
  const courtName = (id: string) => courts.data?.find((c: Court) => c.id === id)?.name ?? "Court";

  async function cancel(b: Booking) {
    try {
      await bookingService.cancelBooking(b.id, user!.id);
      notify("success", `Cancelled ${courtName(b.courtId)} on ${formatDate(dateOf(b.start), "short")}.`);
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Couldn't cancel.");
    } finally {
      refreshData();
    }
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>My bookings</h1>
          <p className="muted">{user.name} · {user.email}</p>
        </div>
        <button className="btn primary" onClick={onBook}>Book a court</button>
      </div>

      {bookings.error && <div className="notice error">{bookings.error}</div>}
      {bookings.loading && !bookings.data && <div className="skeleton short" />}

      {bookings.data && (
        <>
          <h2 className="section-title">Upcoming</h2>
          {upcoming.length === 0 ? (
            <div className="empty">
              <p>No upcoming bookings.</p>
              <button className="btn ghost" onClick={onBook}>Find a court</button>
            </div>
          ) : (
            <ul className="booking-list">
              {upcoming.map((b) => (
                <BookingRow key={b.id} booking={b} courtName={courtName(b.courtId)} onCancel={() => cancel(b)} />
              ))}
            </ul>
          )}

          {past.length > 0 && (
            <>
              <h2 className="section-title">Past & cancelled</h2>
              <ul className="booking-list">
                {past.map((b) => (
                  <BookingRow key={b.id} booking={b} courtName={courtName(b.courtId)} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

function BookingRow({ booking: b, courtName, onCancel }: { booking: Booking; courtName: string; onCancel?: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancelled = b.status === "cancelled";

  return (
    <li className={cancelled ? "booking-row cancelled" : onCancel ? "booking-row" : "booking-row past"}>
      <div className="booking-date">
        <span className="booking-day">{formatDate(dateOf(b.start), "short")}</span>
        <span className="booking-time">{formatTimeRange(b.start, b.end)}</span>
      </div>
      <div className="booking-court">
        {courtName}
        {cancelled && <span className="pill">Cancelled</span>}
      </div>
      {onCancel && (
        <div className="booking-actions">
          {confirming ? (
            <>
              <button className="btn ghost small" onClick={() => setConfirming(false)} disabled={busy}>Keep</button>
              <button
                className="btn danger small"
                disabled={busy}
                onClick={async () => { setBusy(true); await onCancel(); }}
              >
                {busy ? "Cancelling…" : "Yes, cancel"}
              </button>
            </>
          ) : (
            <button className="btn ghost small" onClick={() => setConfirming(true)}>Cancel</button>
          )}
        </div>
      )}
    </li>
  );
}
