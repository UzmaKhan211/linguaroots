import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogoMark } from "@/components/LogoMark";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { signupDestination } from "@/lib/signup";

export const Route = createFileRoute("/choose-name")({
  head: () => ({ meta: [
    { title: "What should we call you? | LinguaRoots" },
    { name: "description", content: "Tell LinguaRoots the name to greet you by." },
    { property: "og:title", content: "What should we call you? | LinguaRoots" },
    { property: "og:description", content: "Tell LinguaRoots the name to greet you by." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ChooseName,
});

function ChooseName() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) { void navigate({ to: "/auth", replace: true }); return; }
    let active = true;
    void supabase.from("profiles").select("display_name, avatar_path, onboarded_at").eq("id", user.id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage("We couldn't load your profile. Please refresh and try again.");
      else {
        const destination = signupDestination(data);
        if (destination !== "/choose-name") { void navigate({ to: destination, replace: true }); return; }
        const suggested = (user.user_metadata?.full_name ?? user.user_metadata?.name ?? "") as string;
        setName(suggested.split(" ")[0] ?? "");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [user, ready, navigate]);

  const trimmed = name.trim();
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !trimmed || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.from("profiles").update({ display_name: trimmed.slice(0, 40) }).eq("id", user.id).select("id").single();
      if (error || !data) { setMessage("We couldn't save your name. Please try again."); return; }
      await navigate({ to: "/choose-companion", replace: true });
    } catch { setMessage("We couldn't save your name. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[440px] bg-background px-6 pb-10 pt-8">
      <LogoMark className="h-14 w-auto" />
      <h1 className="mt-6 text-[2rem] font-semibold leading-tight">What should we call you?</h1>
      <p className="mt-2 text-lg text-muted-foreground">We'll use it to greet you as you learn.</p>
      {loading ? <p className="mt-8" role="status">Getting your profile ready...</p> : (
        <form onSubmit={save} className="mt-8">
          <label htmlFor="name" className="text-sm font-semibold">Your name</label>
          <Input id="name" autoFocus autoComplete="given-name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-2 min-h-14 rounded-2xl text-lg" disabled={busy} />
          <Button type="submit" className="mt-6 min-h-14 w-full rounded-full text-lg font-bold" disabled={!trimmed || busy}>{busy ? "Saving..." : "Continue"}</Button>
        </form>
      )}
      {message && <p className="mt-4 text-sm" role="alert">{message}</p>}
    </div>
  );
}
