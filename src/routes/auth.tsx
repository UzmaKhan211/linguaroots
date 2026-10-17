import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogoMark, Wordmark } from "@/components/LogoMark";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import { signupDestination } from "@/lib/signup";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | LinguaRoots" },
      { name: "description", content: "Sign in or create an account to keep your Khowar practice on every device." },
      { property: "og:title", content: "Sign in | LinguaRoots" },
      { property: "og:description", content: "Sign in or create an account to keep your Khowar practice on every device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { mode?: "signin" } => (s["mode"] === "signin" ? { mode: "signin" } : {}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode === "signin" ? "signin" : "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setChecking(true);
    void supabase.from("profiles").select("avatar_path, onboarded_at").eq("id", user.id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) { setMsg("We couldn't load your profile. Please refresh and try again."); setChecking(false); return; }
      void navigate({ to: signupDestination(data), replace: true });
    });
    return () => { active = false; };
  }, [user, navigate]);

  const social = async (provider: "google" | "apple") => {
    setMsg(null);
    setBusy(true);
    try {
      const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
      if (r.error) setMsg("That didn't work just now. Please try again.");
    } catch { setMsg("That didn't work just now. Please try again."); }
    finally { setBusy(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Nearly there! We've sent you an email. Tap the link in it to finish making your account.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("That email and password don't match. Please check and try again.");
    }
    } catch { setMsg("That didn't work just now. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[440px] bg-background px-6 pb-10 pt-8">
      <header className="flex items-center gap-3"><LogoMark className="h-14 w-auto" /><Wordmark className="h-6 w-auto" /></header>
      {emailOpen && <Button variant="ghost" disabled={busy || checking} className="mt-4 min-h-11 px-0" onClick={() => { setEmailOpen(false); setMsg(null); }}><ArrowLeft aria-hidden /> Back</Button>}
      <h1 className="mt-6 text-[2rem] font-semibold leading-tight">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-2 text-muted-foreground">Your progress stays safe on every device.</p>

      {!emailOpen ? <div className="mt-8 space-y-3">
        <Button type="button" variant="outline" disabled={busy || checking} onClick={() => social("google")} className="min-h-14 w-full rounded-full border-2 bg-card text-base font-bold">Continue with Google</Button>
        <Button type="button" variant="outline" disabled={busy || checking} onClick={() => { setEmailOpen(true); setMsg(null); }} className="min-h-14 w-full rounded-full border-2 bg-card text-base font-bold"><Mail aria-hidden /> Continue with email</Button>
      </div> : (
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">
          Email
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border bg-card px-4 text-base" />
        </label>
        <label className="block text-sm font-semibold">
          Password
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 min-h-12 w-full rounded-2xl border bg-card px-4 text-base"
          />
        </label>
        <Button type="submit" disabled={busy || checking} className="min-h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground disabled:opacity-60">
          {busy ? "Please wait..." : mode === "signup" ? "Create my account" : "Sign in"}
        </Button>
      </form>
      )}

      <div aria-live="polite">{msg && <p className="mt-4 rounded-2xl bg-card p-3">{msg}</p>}</div>

      <Button variant="link" disabled={busy || checking} type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setPassword(""); setMsg(null); }} className="mt-4 min-h-11 w-full font-bold text-primary underline">
        {mode === "signup" ? "I already have an account" : "I'm new, create an account"}
      </Button>
    </div>
  );
}
