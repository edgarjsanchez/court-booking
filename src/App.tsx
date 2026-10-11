import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { AppProvider, useApp } from "./context/AppContext";
import { BookPage } from "./pages/BookPage";
import { CourtsPage } from "./pages/CourtsPage";
import { MyBookingsPage } from "./pages/MyBookingsPage";
import { SignInPage } from "./pages/SignInPage";
import { bookingService } from "./services";

export type Route = "book" | "courts" | "mine" | "signin";
const ROUTES: Route[] = ["book", "courts", "mine", "signin"];

function readRoute(): Route {
  const r = window.location.hash.replace("#/", "") as Route;
  return ROUTES.includes(r) ? r : "book";
}

function Shell() {
  const [route, setRoute] = useState<Route>(readRoute);
  const { authReady, authMode, user, toast, refreshData, notify } = useApp();

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = (r: Route) => {
    window.location.hash = `/${r}`;
    setRoute(r);
    window.scrollTo(0, 0);
  };

  // Once signed in, leave the sign-in page.
  useEffect(() => {
    if (user && route === "signin") navigate("book");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, route]);

  function resetDemo() {
    bookingService.reset?.();
    refreshData();
    notify("success", "Demo data reset.");
  }

  return (
    <>
      <Header route={route} onNavigate={navigate} />
      <main className="main">
        {!authReady ? null : route === "signin" && authMode === "neon" ? (
          <SignInPage onDone={() => navigate("book")} />
        ) : route === "book" || route === "signin" ? (
          <BookPage onSignIn={() => navigate("signin")} />
        ) : route === "courts" ? (
          <CourtsPage onBook={() => navigate("book")} />
        ) : (
          <MyBookingsPage onBook={() => navigate("book")} onSignIn={() => navigate("signin")} />
        )}
      </main>
      <footer className="footer">
        {authMode === "demo" ? (
          <>
            <span>Demo mode · data is saved in this browser only</span>
            <button className="link-btn" onClick={resetDemo}>Reset demo data</button>
          </>
        ) : (
          <span>Bookings are saved in the club's database</span>
        )}
      </footer>
      <div className="toast-region" aria-live="polite">
        {toast && <div key={toast.id} className={`toast ${toast.kind}`}>{toast.text}</div>}
      </div>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
