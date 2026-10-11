import { useState } from "react";
import { BookingDialog } from "../components/BookingDialog";
import { DateStrip } from "../components/DateStrip";
import { Legend, SlotGrid } from "../components/SlotGrid";
import { useAsync } from "../components/useAsync";
import { RULES, facilityNow } from "../config";
import { useApp } from "../context/AppContext";
import { allowedDurations } from "../domain/rules";
import { formatDate, formatTimeRange, toDateKey, addHours } from "../domain/time";
import type { Slot } from "../domain/types";
import { bookingService } from "../services";

export function BookPage({ onSignIn }: { onSignIn: () => void }) {
  const { user, authMode, dataVersion, refreshData, notify } = useApp();
  const [date, setDate] = useState(() => toDateKey(facilityNow()));
  const [picked, setPicked] = useState<Slot | null>(null);

  const courts = useAsync(() => bookingService.listCourts(), []);
  const slots = useAsync(() => bookingService.getAvailability(date, user?.id ?? null), [date, user?.id, dataVersion]);

  const court = picked && courts.data?.find((c) => c.id === picked.courtId);
  const openCount = slots.data?.filter((s) => s.status === "open").length ?? 0;

  async function confirm(hours: number) {
    if (!picked || !user) return;
    try {
      await bookingService.createBooking({ courtId: picked.courtId, userId: user.id, start: picked.start, hours });
      notify("success", `Booked ${court?.name}, ${formatDate(date, "short")}, ${formatTimeRange(picked.start, addHours(picked.start, hours))}.`);
      setPicked(null);
    } finally {
      // Whether it worked or someone beat us to it, show the latest grid.
      refreshData();
    }
  }

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>Book a court</h1>
          <p className="muted">
            {formatDate(date)} · {slots.loading && !slots.data ? "Loading…" : `${openCount} open slot${openCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <Legend />
      </div>

      <DateStrip value={date} onChange={setDate} />

      {!user && (
        <div className="notice">
          {authMode === "demo" ? (
            "You can look around while signed out. To book, choose a demo player in the top-right corner."
          ) : (
            <>
              You can look around while signed out.{" "}
              <button className="link-btn" onClick={onSignIn}>Sign in or create an account</button> to book.
            </>
          )}
        </div>
      )}

      {(courts.error || slots.error) && <div className="notice error">{courts.error ?? slots.error}</div>}

      {courts.data && slots.data ? (
        <div className={slots.loading ? "grid-wrap is-refreshing" : "grid-wrap"}>
          <SlotGrid date={date} courts={courts.data} slots={slots.data} onPick={setPicked} />
        </div>
      ) : (
        !courts.error && !slots.error && <div className="skeleton" aria-label="Loading courts" />
      )}

      <p className="fine-print">
        Up to {RULES.maxHours} hours per booking · {RULES.maxActivePerUser} upcoming bookings per player · book up to {RULES.daysAhead} days ahead.
        ☾ means the court has no lights.
      </p>

      {picked && court && slots.data && (
        <BookingDialog
          court={court}
          slot={picked}
          durations={allowedDurations(picked.courtId, picked.start, slots.data, RULES)}
          signedIn={!!user}
          signInHint={authMode === "demo" ? "Pick a demo player at the top right to sign in first." : undefined}
          onSignIn={() => { setPicked(null); onSignIn(); }}
          onConfirm={confirm}
          onClose={() => setPicked(null)}
        />
      )}
    </section>
  );
}
