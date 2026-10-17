import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { signupDestination } from "@/lib/signup";

export const Route = createFileRoute("/create-password")({
  head: () => ({ meta: [
    { title: "Create your password | LinguaRoots" },
    { name: "description", content: "Choose a password after verifying your email to start learning your heritage language." },
    { property: "og:title", content: "Create your password | LinguaRoots" },
    { property: "og:description", content: "Finish verifying your LinguaRoots account and choose a password." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: CreatePassword,
});

function CreatePassword() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [checked, setChecked] = useState(false);
  const [verified, setVerified] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.has("error") || query.has("error")) {
      setInvalidLink(true);
      setChecked(true);
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (!active) return;
      if (error || !data.user?.email_confirmed_at) {
        setVerified(false);
        setChecked(true);
        return;
      }
      // Existing learners keep their password and go to their normal destination.
      const profile = await supabase.from("profiles").select("display_name, avatar_path, onboarded_at").eq("id", data.user.id).maybeSingle();
      if (!active) return;
      if (profile.error) {
        setMessage("We couldn't load your account. Please refresh and try again.");
        setChecked(true);
        return;
      }
      if (profile.data?.onboarded_at) {
        void navigate({ to: signupDestination(profile.data), replace: true });
        return;
      }
      setVerified(true);
      setChecked(true);
    }).catch(() => {
      if (active) { setMessage("We couldn't verify your account. Please refresh and try again."); setChecked(true); }
    });
    return () => { active = false; };
  }, [ready, user?.id, navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!verified || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setMessage(error.message); return; }
      setPassword("");
      setShowPassword(false);
      const { data: current } = await supabase.auth.getUser();
      if (!current.user) { setMessage("Please open your verification link again."); return; }
      const { data, error: profileError } = await supabase.from("profiles").select("display_name, avatar_path, onboarded_at").eq("id", current.user.id).maybeSingle();
      if (profileError) { setMessage("Your password is saved. Please refresh to continue."); return; }
      await navigate({ to: signupDestination(data), replace: true });
    } catch { setMessage("We couldn't save your password. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[440px] bg-background px-6 pb-10 pt-10">
      <LogoMark className="h-16 w-auto" />
      <h1 className="mt-8 text-[2rem] font-semibold leading-tight">Create your password</h1>
      {!checked ? <p className="mt-4 text-muted-foreground" role="status">Verifying your email...</p> : verified && !invalidLink ? <>
        <p className="mt-3 text-muted-foreground">Your email is verified. Choose a password for your account.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="new-password" className="block font-bold">Password</label>
            <div className="relative mt-2">
              <input id="new-password" type={showPassword ? "text" : "password"} required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="min-h-14 w-full rounded-full border bg-muted pl-5 pr-16 text-base" />
              <Button type="button" variant="ghost" size="icon" aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} aria-controls="new-password" onClick={() => setShowPassword((shown) => !shown)} className="absolute right-2 top-1/2 size-11 -translate-y-1/2 rounded-full text-muted-foreground">
                {showPassword ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
              </Button>
            </div>
          </div>
          <Button type="submit" disabled={busy} className="min-h-14 w-full rounded-full text-lg font-bold">{busy ? "Please wait..." : "Save password"}</Button>
        </form>
      </> : <>
        <p className="mt-4 text-muted-foreground">{invalidLink ? "This verification link has expired or already been used. Request a new one to continue." : "Open the verification link in your email to create your password."}</p>
        <Button onClick={() => navigate({ to: "/auth" })} className="mt-8 min-h-14 w-full rounded-full text-lg font-bold">Back to sign up</Button>
      </>}
      {message && <p className="mt-4 rounded-2xl bg-card p-3" role="alert">{message}</p>}
    </div>
  );
}