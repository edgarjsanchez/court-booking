import { useEffect, useRef, useState } from "react";
import { RULES } from "../config";
import { formatDate, formatTimeRange, addHours, dateOf } from "../domain/time";
import type { Court, Slot } from "../domain/types";

interface Props {
  court: Court;
  slot: Slot;
  durations: number[];
  signedIn: boolean;
  /** Demo mode shows a hint; otherwise a "Sign in to book" button. */
  signInHint?: string;
  onSignIn: () => void;
  onConfirm: (hours: number) => Promise<void>;
  onClose: () => void;
}

export function BookingDialog({ court, slot, durations, signedIn, signInHint, onSignIn, onConfirm, onClose }: Props) {
  const [hours, setHours] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(hours);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't book that slot.");
      setBusy(false);
    }
  }

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
        <p className="eyebrow">{formatDate(dateOf(slot.start))}</p>
        <h2 id="dlg-title">{court.name}</h2>
        <p className="muted">
          {court.surface[0].toUpperCase() + court.surface.slice(1)} · {court.indoor ? "Indoor" : "Outdoor"}
          {court.hasLights ? " · Lights" : ""}
        </p>

        <fieldset className="duration">
          <legend>How long?</legend>
          {Array.from({ length: RULES.maxHours }, (_, i) => i + 1).map((h) => {
            const allowed = durations.includes(h);
            return (
              <label key={h} className={!allowed ? "disabled" : hours === h ? "checked" : ""}>
                <input type="radio" name="hours" value={h} checked={hours === h} disabled={!allowed} onChange={() => setHours(h)} />
                <span className="duration-main">{h} hour{h > 1 ? "s" : ""}</span>
                <span className="duration-sub">{allowed ? formatTimeRange(slot.start, addHours(slot.start, h)) : h === 1 ? "No longer available" : "Next hour is taken"}</span>
              </label>
            );
          })}
        </fieldset>

        {error && <p className="form-error" role="alert">{error}</p>}
        {!signedIn && signInHint && <p className="form-error" role="alert">{signInHint}</p>}

        <div className="dialog-actions">
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          {!signedIn && !signInHint ? (
            <button ref={confirmRef} className="btn primary" onClick={onSignIn}>Sign in to book</button>
          ) : (
            <button ref={confirmRef} className="btn primary" onClick={submit} disabled={busy || !signedIn || durations.length === 0}>
              {busy ? "Booking…" : "Confirm booking"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
