import { useAsync } from "../components/useAsync";
import { formatHour } from "../domain/time";
import { RULES } from "../config";
import { bookingService } from "../services";

export function CourtsPage({ onBook }: { onBook: () => void }) {
  const facility = useAsync(() => bookingService.getFacility(), []);
  const courts = useAsync(() => bookingService.listCourts(), []);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>{facility.data?.name ?? "Courts"}</h1>
          <p className="muted">
            {facility.data?.address ?? " "} · Open {formatHour(RULES.openHour)} – {formatHour(RULES.closeHour)} daily
          </p>
        </div>
        <button className="btn primary" onClick={onBook}>Book a court</button>
      </div>

      {courts.error && <div className="notice error">{courts.error}</div>}
      {!courts.data && !courts.error && <div className="skeleton short" />}

      <ul className="court-cards">
        {courts.data?.map((c) => (
          <li key={c.id} className={`court-card ${c.surface}`}>
            <div className="court-art" aria-hidden>
              <div className="court-lines" />
            </div>
            <div className="court-body">
              <h2>{c.name}</h2>
              <ul className="tags">
                <li>{c.surface[0].toUpperCase() + c.surface.slice(1)}</li>
                <li>{c.indoor ? "Indoor" : "Outdoor"}</li>
                <li>{c.hasLights || c.indoor ? "Lights" : "No lights"}</li>
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
