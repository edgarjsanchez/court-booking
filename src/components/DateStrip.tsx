import { RULES, facilityNow } from "../config";
import { addDays, parseLocal, toDateKey } from "../domain/time";

export function DateStrip({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = toDateKey(facilityNow());
  const days = Array.from({ length: RULES.daysAhead + 1 }, (_, i) => addDays(today, i));

  return (
    <div className="date-strip" role="tablist" aria-label="Choose a date">
      {days.map((d, i) => {
        const date = parseLocal(d);
        return (
          <button
            key={d}
            role="tab"
            aria-selected={d === value}
            className={d === value ? "date-chip selected" : "date-chip"}
            onClick={() => onChange(d)}
          >
            <span className="date-chip-dow">{i === 0 ? "Today" : date.toLocaleDateString(undefined, { weekday: "short" })}</span>
            <span className="date-chip-day">{date.getDate()}</span>
            <span className="date-chip-mon">{date.toLocaleDateString(undefined, { month: "short" })}</span>
          </button>
        );
      })}
    </div>
  );
}
