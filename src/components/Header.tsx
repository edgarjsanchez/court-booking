import { DEMO_USERS } from "../seed";
import { useApp } from "../context/AppContext";
import type { Route } from "../App";

const NAV: { route: Route; label: string }[] = [
  { route: "book", label: "Book" },
  { route: "courts", label: "Courts" },
  { route: "mine", label: "My bookings" },
];

export function Header({ route, onNavigate }: { route: Route; onNavigate: (r: Route) => void }) {
  const { user, authMode, signInDemo, signOut } = useApp();

  return (
    <header className="header">
      <div className="header-inner">
        <a className="brand" href="#/book" onClick={(e) => { e.preventDefault(); onNavigate("book"); }}>
          <span className="brand-ball" aria-hidden />
          <span>Court<b>Book</b></span>
        </a>

        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <a
              key={n.route}
              href={`#/${n.route}`}
              className={route === n.route ? "nav-link active" : "nav-link"}
              aria-current={route === n.route ? "page" : undefined}
              onClick={(e) => { e.preventDefault(); onNavigate(n.route); }}
            >
              {n.label}
            </a>
          ))}
        </nav>

        {authMode === "demo" ? (
          <label className="user-switch">
            <span className="user-switch-label">{user ? "Signed in as" : "Demo sign-in"}</span>
            <select value={user?.id ?? ""} onChange={(e) => (e.target.value ? signInDemo(e.target.value) : signOut())}>
              <option value="">Signed out</option>
              {DEMO_USERS.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
        ) : user ? (
          <div className="user-switch">
            <span className="user-name" title={user.email}>{user.name}</span>
            <button className="btn on-dark small" onClick={() => signOut()}>Sign out</button>
          </div>
        ) : (
          <div className="user-switch">
            <button className="btn primary small" onClick={() => onNavigate("signin")}>Sign in</button>
          </div>
        )}
      </div>
    </header>
  );
}
