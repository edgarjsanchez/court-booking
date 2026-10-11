import { RULES } from "../config";
import { atHour, formatHour } from "../domain/time";
import type { Court, Slot } from "../domain/types";

const LABEL: Record<Slot["status"], string> = {
  open: "Available",
  booked: "Booked",
  mine: "Your booking",
  past: "Past",
};

interface Props {
  date: string;
  courts: Court[];
  slots: Slot[];
  onPick: (slot: Slot) => void;
}

export function SlotGrid({ date, courts, slots, onPick }: Props) {
  const hours = Array.from({ length: RULES.closeHour - RULES.openHour }, (_, i) => RULES.openHour + i);
  const lookup = new Map(slots.map((s) => [`${s.courtId}|${s.start}`, s]));

  return (
    <div className="grid-scroll">
      <table className="slot-grid">
        <thead>
          <tr>
            <th scope="col" className="time-col"><span className="sr-only">Time</span></th>
            {courts.map((c) => (
              <th scope="col" key={c.id}>
                <div className="court-head">
                  <span>{c.name}</span>
                  <span className={`surface-tag ${c.surface}`}>{c.indoor ? "Indoor" : c.surface}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => (
            <tr key={h}>
              <th scope="row" className="time-col">{formatHour(h)}</th>
              {courts.map((c) => {
                const slot = lookup.get(`${c.id}|${atHour(date, h)}`);
                if (!slot) return <td key={c.id} />;
                const noLights = !c.hasLights && !c.indoor && h >= 18;
                return (
                  <td key={c.id}>
                    <button
                      className={`slot ${slot.status}`}
                      disabled={slot.status !== "open"}
                      onClick={() => onPick(slot)}
                      aria-label={`${c.name}, ${formatHour(h)}: ${LABEL[slot.status]}`}
                      title={noLights && slot.status === "open" ? "No lights on this court" : LABEL[slot.status]}
                    >
                      {slot.status === "open" ? (noLights ? "Open ☾" : "Open") : slot.status === "mine" ? "Yours" : slot.status === "booked" ? "Booked" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Legend() {
  return (
    <ul className="legend" aria-label="Legend">
      <li><span className="swatch open" /> Available</li>
      <li><span className="swatch mine" /> Yours</li>
      <li><span className="swatch booked" /> Booked</li>
      <li><span className="swatch past" /> Past</li>
    </ul>
  );
}
