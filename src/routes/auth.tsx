import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AvatarPicker } from "@/components/AvatarPicker";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { isOnboarded } from "@/lib/progress";
import { DEFAULT_AVATAR, setPendingAvatar } from "@/lib/avatars";

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
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate({ to: isOnboarded() ? "/" : "/choose-language", replace: true });
  }, [user, navigate]);

  const social = async (provider: "google" | "apple") => {
    setMsg(null);
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) setMsg("That didn't work just now. Please try again.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
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
    setBusy(false);
  };

  return (
    <AppShell>
      <h1 className="text-[2rem] font-semibold leading-tight">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-2 text-muted-foreground">Your progress stays safe on every device.</p>

      <div className="mt-6 space-y-3">
        <button type="button" onClick={() => social("google")} className="min-h-12 w-full rounded-full border-2 bg-card font-bold">
          Continue with Google
        </button>
        <button type="button" onClick={() => social("apple")} className="min-h-12 w-full rounded-full border-2 bg-card font-bold">
          Continue with Apple
        </button>
      </div>

      <p className="my-5 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">or use email</p>

      <form onSubmit={submit} className="space-y-3">
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
        <button type="submit" disabled={busy} className="min-h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground disabled:opacity-60">
          {mode === "signup" ? "Create my account" : "Sign in"}
        </button>
      </form>

      <div aria-live="polite">{msg && <p className="mt-4 rounded-2xl bg-card p-3">{msg}</p>}</div>

      <button type="button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="mt-4 min-h-11 w-full font-bold text-primary underline">
        {mode === "signup" ? "I already have an account" : "I'm new, create an account"}
      </button>
    </AppShell>
  );
}
