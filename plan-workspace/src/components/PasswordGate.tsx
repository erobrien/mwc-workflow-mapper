import { useEffect, useState, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { LastUpdated } from "./Shell";

// Shared client-side lock. No expiry (persisted to localStorage). Client-only:
// treat this as a friction gate for the shared plan, not a security boundary.
const KEY = "mwc-plan-unlocked";
const PASSWORD = "0607";

export function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(KEY) === "1") setUnlocked(true); } catch {}
    setReady(true);
  }, []);

  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === PASSWORD) {
      try { localStorage.setItem(KEY, "1"); } catch {}
      setUnlocked(true);
    } else {
      setError(true);
      setInput("");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-sm border-2 border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-border bg-primary text-primary-foreground">
            <Lock className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-bold text-foreground">MWC GHL Refactor Workspace</div>
            <div className="text-xs text-foreground/70">Enter the shared password to continue</div>
          </div>
        </div>
        <input
          type="password"
          autoFocus
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(false); }}
          className="w-full rounded-sm border-2 border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Password"
        />
        {error && <div className="text-xs font-semibold text-destructive">Incorrect password. Try again.</div>}
        <button type="submit" className="w-full rounded-sm border-2 border-border bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Unlock
        </button>
        <div className="border-t-2 border-border pt-3"><LastUpdated /></div>
      </form>
    </div>
  );
}
