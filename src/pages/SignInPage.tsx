import { useState, type FormEvent } from "react";
import { useApp } from "../context/AppContext";

export function SignInPage({ onDone }: { onDone: () => void }) {
  const { signInWithEmail, signUp, notify } = useApp();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signin") await signInWithEmail(email.trim(), password);
      else await signUp(name.trim(), email.trim(), password);
      notify("success", mode === "signin" ? "Welcome back!" : "Account created. You're signed in.");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const isSignUp = mode === "signup";

  return (
    <section className="page auth-page">
      <div className="auth-card">
        <span className="brand-ball big" aria-hidden />
        <h1>{isSignUp ? "Create your account" : "Sign in"}</h1>
        <p className="muted">{isSignUp ? "Book courts in seconds." : "Welcome back. Ready to play?"}</p>

        <div className="auth-tabs" role="tablist">
          <button role="tab" aria-selected={!isSignUp} className={!isSignUp ? "active" : ""} onClick={() => { setMode("signin"); setError(null); }}>
            Sign in
          </button>
          <button role="tab" aria-selected={isSignUp} className={isSignUp ? "active" : ""} onClick={() => { setMode("signup"); setError(null); }}>
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {isSignUp && (
            <label>
              <span>Name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Alex Rivera" />
            </label>
          )}
          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder={isSignUp ? "At least 8 characters" : ""}
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn primary full" disabled={busy}>
            {busy ? "One moment…" : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>
      </div>
    </section>
  );
}
