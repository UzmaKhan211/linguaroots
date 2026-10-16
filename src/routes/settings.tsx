import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { replayOnboarding } from "@/lib/progress";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings | LinguaRoots" },
      { name: "description", content: "Manage your LinguaRoots account and replay the welcome." },
      { property: "og:title", content: "Settings | LinguaRoots" },
      { property: "og:description", content: "Manage your LinguaRoots account and replay the welcome." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const remove = async () => {
    setMsg(null);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      navigate({ to: "/welcome" });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "We couldn't delete your account just now.");
    }
  };

  return (
    <AppShell>
      <h1 className="text-[2rem] font-semibold">Settings</h1>

      <section className="mt-6 rounded-3xl border bg-card p-5">
        {!ready ? null : user ? (
          <>
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="font-bold break-all">{user.email}</p>
            <button type="button" onClick={() => supabase.auth.signOut()} className="mt-4 min-h-12 w-full rounded-full border-2 font-bold">
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="font-bold">You're practicing as a guest</p>
            <p className="mt-1 text-sm text-muted-foreground">Your progress is only on this phone for now.</p>
            <Link to="/auth" className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
              Save my progress
            </Link>
          </>
        )}
      </section>

      <button
        type="button"
        onClick={() => {
          replayOnboarding();
          navigate({ to: "/welcome" });
        }}
        className="mt-4 min-h-12 w-full rounded-full border-2 bg-card font-bold"
      >
        Replay the welcome
      </button>

      {user && (
        <section className="mt-8 rounded-3xl border-2 border-destructive/40 bg-card p-5">
          <p className="font-bold">Delete account</p>
          <p className="mt-1 text-sm text-muted-foreground">This removes your account and all saved progress. It can't be undone.</p>
          {confirming ? (
            <div className="mt-3 space-y-2">
              <button type="button" onClick={remove} className="min-h-12 w-full rounded-full bg-destructive font-bold text-destructive-foreground">
                Yes, delete my account
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="min-h-12 w-full rounded-full border-2 font-bold">
                Keep my account
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="mt-3 min-h-12 w-full rounded-full border-2 border-destructive font-bold">
              Delete my account
            </button>
          )}
          {msg && <p className="mt-2 text-sm" role="alert">{msg}</p>}
        </section>
      )}
    </AppShell>
  );
}
