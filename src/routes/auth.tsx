import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/LogoMark";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, Mail } from "lucide-react";

import { signupDestination } from "@/lib/signup";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | LinguaRoots" },
      { name: "description", content: "Sign in or create an account to keep your heritage language practice on every device." },
      { property: "og:title", content: "Sign in | LinguaRoots" },
      { property: "og:description", content: "Sign in or create an account to keep your heritage language practice on every device." },
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
  const [showPassword, setShowPassword] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setChecking(true);
    void supabase.from("profiles").select("display_name, avatar_path, onboarded_at").eq("id", user.id).maybeSingle().then(({ data, error }) => {
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
      else if (!data.session) setSentTo(email);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("That email and password don't match. Please check and try again.");
    }
    } catch { setMsg("That didn't work just now. Please try again."); }
    finally { setBusy(false); }
  };

  const onForm = (e: React.FormEvent) => {
    if (!emailOpen) { e.preventDefault(); setEmailOpen(true); setMsg(null); return; }
    void submit(e);
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[440px] bg-background px-6 pb-10 pt-10">
      <LogoMark className="h-16 w-auto" />
      <h1 className="mt-8 text-[2rem] font-semibold leading-tight">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>

      <Button type="button" variant="outline" disabled={busy || checking} onClick={() => social("google")} className="relative mt-8 min-h-14 w-full rounded-full border bg-card text-base font-bold">
        <GoogleIcon className="absolute left-6 size-5" /> Continue with Google
      </Button>

      <div className="my-6 flex items-center gap-4 text-sm font-semibold text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onForm} className="space-y-4">
        <label className="block font-bold">
          Email
          <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 min-h-14 w-full rounded-full border bg-muted px-5 text-base font-normal" />
        </label>
        {emailOpen && (
          <div className="fade-up">
            <label htmlFor="auth-password" className="block font-bold">Password</label>
            <div className="relative mt-2">
            <input
              id="auth-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoFocus
              placeholder={mode === "signup" ? "At least 6 characters" : "Password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-14 w-full rounded-full border bg-muted pl-5 pr-16 text-base font-normal"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={showPassword ? "Hide password" : "Show password"}
              title={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              aria-controls="auth-password"
              onClick={() => setShowPassword((shown) => !shown)}
              className="absolute right-2 top-1/2 size-11 -translate-y-1/2 rounded-full text-muted-foreground"
            >
              {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
            </Button>
            </div>
          </div>
        )}
        <Button type="submit" disabled={busy || checking} className="min-h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-lift disabled:opacity-60">
          {busy ? "Please wait..." : !emailOpen ? "Continue" : mode === "signup" ? "Create my account" : "Sign in"}
        </Button>
      </form>

      <div aria-live="polite">{msg && <p className="mt-4 rounded-2xl bg-card p-3">{msg}</p>}</div>

      <Dialog open={sentTo !== null} onOpenChange={(o) => { if (!o) setSentTo(null); }}>
        <DialogContent className="max-w-[360px] rounded-3xl p-7 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Mail className="size-8" aria-hidden />
          </div>
          <DialogHeader className="sm:text-center">
            <DialogTitle className="text-center text-2xl">Check your inbox</DialogTitle>
            <DialogDescription className="text-center text-base text-foreground">
              We sent a link to <span className="break-all font-bold">{sentTo}</span>. Tap it to finish making your account and meet your companion.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Can't find it after a minute? Have a look in your spam or junk folder.</p>
          <Button type="button" onClick={() => setSentTo(null)} className="min-h-14 w-full rounded-full text-lg font-bold">Got it</Button>
        </DialogContent>
      </Dialog>

      <p className="mt-6 text-center text-muted-foreground">
        {mode === "signup" ? "Already have an account? " : "New to LinguaRoots? "}
        <button type="button" disabled={busy || checking} onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setPassword(""); setShowPassword(false); setMsg(null); }} className="min-h-11 font-bold text-foreground underline underline-offset-4">
          {mode === "signup" ? "Log in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.67-5.85-5.96S8.78 6.26 12 6.26c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.68 3.7 14.55 2.8 12 2.8 6.92 2.8 2.8 6.92 2.8 12s4.12 9.2 9.2 9.2c5.31 0 8.83-3.73 8.83-8.99 0-.6-.07-1.06-.15-1.51z" />
    </svg>
  );
}
