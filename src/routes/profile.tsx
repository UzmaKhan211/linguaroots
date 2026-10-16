import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, ChevronRight, Globe2, RotateCcw, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { replayOnboarding } from "@/lib/progress";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile | LinguaRoots" },
      { name: "description", content: "Update your name and photo, change your language and manage your LinguaRoots account." },
      { property: "og:title", content: "Profile | LinguaRoots" },
      { property: "og:description", content: "Update your name and photo, change your language and manage your LinguaRoots account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.from("profiles").select("display_name, avatar_path").eq("id", user.id).maybeSingle();
      const n = data?.display_name ?? "";
      setName(n);
      setSavedName(n);
      if (data?.avatar_path) {
        const { data: s } = await supabase.storage.from("avatars").createSignedUrl(data.avatar_path, 3600);
        setAvatarUrl(s?.signedUrl ?? null);
      }
    })();
  }, [user]);

  const saveName = async () => {
    if (!user) return;
    const n = name.trim().slice(0, 40);
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: n || null }).eq("id", user.id);
    setBusy(false);
    if (error) return setNote("We couldn't save your name just now. Please try again.");
    setSavedName(n);
    setName(n);
    setNote("Your name is saved.");
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!user || !file) return;
    if (!file.type.startsWith("image/")) return setNote("Please choose a photo.");
    if (file.size > 5 * 1024 * 1024) return setNote("That photo is a bit big. Please pick one under 5 MB.");
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (up.error) {
      setBusy(false);
      return setNote("We couldn't upload that photo. Please try again.");
    }
    await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
    const { data: s } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    setAvatarUrl(s?.signedUrl ?? null);
    setBusy(false);
    setNote("Your new photo is saved.");
  };

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

  const initial = (savedName || user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <AppShell>
      <h1 className="text-[2rem] font-semibold">Profile</h1>

      <section className="mt-6 rounded-3xl border bg-card p-5">
        {!ready ? null : user ? (
          <>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                aria-label="Change your photo"
                className="relative size-20 shrink-0 rounded-full bg-leaf-soft disabled:opacity-60"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="size-20 rounded-full object-cover" />
                ) : (
                  <span className="flex size-20 items-center justify-center rounded-full font-display text-3xl font-semibold text-primary">
                    {initial}
                  </span>
                )}
                <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border-2 border-card bg-bark text-primary-foreground">
                  <Camera className="size-4" aria-hidden />
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void pickPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold">{savedName || "Add your name"}</p>
                <p className="break-all text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <label htmlFor="display-name" className="mt-5 block font-bold">
              Your name
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="display-name"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 bg-background px-4 text-base"
              />
              <button
                type="button"
                onClick={saveName}
                disabled={busy || name.trim() === savedName}
                className="min-h-12 shrink-0 rounded-full bg-primary px-5 font-bold text-primary-foreground disabled:opacity-50"
              >
                Save
              </button>
            </div>
            {note && (
              <p className="mt-3 text-sm" role="status">
                {note}
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="flex size-14 items-center justify-center rounded-full bg-muted">
                <UserRound className="size-7 text-muted-foreground" aria-hidden />
              </span>
              <div>
                <p className="font-bold">You're practicing as a guest</p>
                <p className="text-sm text-muted-foreground">Sign in to add your name and photo.</p>
              </div>
            </div>
            <Link to="/auth" className="mt-4 flex min-h-12 w-full items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
              Save my progress
            </Link>
          </>
        )}
      </section>

      <h2 className="mt-8 text-lg font-semibold">Learning</h2>
      <Link to="/languages" className="mt-2 flex min-h-14 items-center gap-3 rounded-3xl border bg-card p-4">
        <Globe2 className="size-6 text-primary" aria-hidden />
        <span className="flex-1">
          <span className="block font-bold">Language</span>
          <span className="block text-sm text-muted-foreground">Khowar</span>
        </span>
        <span className="text-sm font-bold text-muted-foreground">Change</span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </Link>

      <h2 className="mt-8 text-lg font-semibold">Account</h2>
      <div className="mt-2 space-y-3">
        <button
          type="button"
          onClick={() => {
            replayOnboarding();
            navigate({ to: "/welcome" });
          }}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 bg-card font-bold"
        >
          <RotateCcw className="size-4" aria-hidden /> Replay the welcome
        </button>
        {user && (
          <button type="button" onClick={() => supabase.auth.signOut()} className="min-h-12 w-full rounded-full border-2 bg-card font-bold">
            Sign out
          </button>
        )}
      </div>

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
          {msg && (
            <p className="mt-2 text-sm" role="alert">
              {msg}
            </p>
          )}
        </section>
      )}
    </AppShell>
  );
}
