import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/LogoMark";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AVATARS, avatarPathValue } from "@/lib/avatars";
import { signupDestination } from "@/lib/signup";

export const Route = createFileRoute("/choose-companion")({
  head: () => ({ meta: [
    { title: "Choose your companion | LinguaRoots" },
    { name: "description", content: "Pick a friendly character for your LinguaRoots profile." },
    { property: "og:title", content: "Choose your companion | LinguaRoots" },
    { property: "og:description", content: "Pick a friendly character for your LinguaRoots profile." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ChooseCompanion,
});

function ChooseCompanion() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [selected, setSelected] = useState("");
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
        if (destination !== "/choose-companion") { void navigate({ to: destination, replace: true }); return; }
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [user, ready, navigate]);

  const save = async () => {
    if (!user || !selected || busy) return;
    setBusy(true);
    setMessage(null);
    let saved = false;
    try {
      const { data, error } = await supabase.from("profiles").update({ avatar_path: avatarPathValue(selected) }).eq("id", user.id).select("id").single();
      saved = !error && !!data;
    } catch { saved = false; }
    setBusy(false);
    if (!saved) { setMessage("We couldn't save your companion. Please try again."); return; }
    void navigate({ to: "/choose-language", replace: true });
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-[440px] bg-background px-6 pb-10 pt-8">
      <LogoMark className="h-14 w-auto" />
      <h1 className="mt-6 text-[2rem] font-semibold leading-tight">Choose your companion</h1>
      <p className="mt-2 text-lg text-muted-foreground">A friendly face to learn with.</p>
      {loading ? <p className="mt-8" role="status">Getting your profile ready...</p> : <>
        <div className="mt-8"><AvatarPicker value={selected} onChange={setSelected} disabled={busy || !!message?.includes("load")} /></div>
        <p className="mt-4 min-h-6 text-center font-semibold" aria-live="polite">{AVATARS.find((a) => a.id === selected)?.label ?? ""}</p>
        <Button className="mt-6 min-h-14 w-full rounded-full text-lg font-bold" onClick={save} disabled={!selected || busy}>{busy ? "Saving..." : "Continue"}</Button>
      </>}
      {message && <p className="mt-4 text-sm" role="alert">{message}</p>}
    </div>
  );
}