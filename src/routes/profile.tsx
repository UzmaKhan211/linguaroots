import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Globe2, RotateCcw, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AvatarPicker } from "@/components/AvatarPicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { replayOnboarding } from "@/lib/progress";
import { deleteMyAccount } from "@/lib/account.functions";
import { DEFAULT_AVATAR, avatarPathValue, avatarSrc } from "@/lib/avatars";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile | LinguaRoots" },
      { name: "description", content: "Update your name and character, change your language and manage your LinguaRoots account." },
      { property: "og:title", content: "Profile | LinguaRoots" },
      { property: "og:description", content: "Update your name and character, change your language and manage your LinguaRoots account." },
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
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [savedAvatar, setSavedAvatar] = useState(DEFAULT_AVATAR);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase.from("profiles").select("display_name, avatar_path").eq("id", user.id).maybeSingle();
      const n = data?.display_name ?? "";
      setName(n);
      setSavedName(n);
      const stored = data?.avatar_path ?? "";
      const chosen = avatarSrc(stored) ? stored.replace("avatar:", "") : DEFAULT_AVATAR;
      setAvatar(chosen);
      setSavedAvatar(chosen);
    })();
  }, [user]);

  const dirty = name.trim() !== savedName || avatar !== savedAvatar;

  const saveChanges = async () => {
    if (!user) return;
    const n = name.trim().slice(0, 40);
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: n || null, avatar_path: avatarPathValue(avatar) })
      .eq("id", user.id);
    setBusy(false);
    if (error) return setNote("We couldn't save your changes just now. Please try again.");
    setSavedName(n);
    setName(n);
    setSavedAvatar(avatar);
    setNote("Your changes are saved.");
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
  const avatarImg = avatarSrc(avatarPathValue(avatar));

  return (
    <AppShell>
      <h1 className="text-[2rem] font-semibold">Profile</h1>

      <section className="mt-6 rounded-3xl border bg-card p-5">
        {!ready ? null : user ? (
          <>
            <div className="flex items-center gap-4">
              <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-leaf-soft">
                {avatarImg ? (
                  <img src={avatarImg} alt="" className="size-20 rounded-full object-cover" />
                ) : (
                  <span className="flex size-20 items-center justify-center rounded-full font-display text-3xl font-semibold text-primary">
                    {initial}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <p className="font-display text-xl font-semibold">{savedName || "Add your name"}</p>
                <p className="break-all text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <p className="mt-5 block font-bold">Your character</p>
            <div className="mt-2">
              <AvatarPicker value={avatar} onChange={setAvatar} disabled={busy} />
            </div>

            <label htmlFor="display-name" className="mt-5 block font-bold">
              Your name
            </label>
            <input
              id="display-name"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should we call you?"
              className="mt-2 min-h-12 w-full rounded-2xl border-2 bg-background px-4 text-base"
            />
            <button
              type="button"
              onClick={saveChanges}
              disabled={busy || !dirty}
              className="mt-3 min-h-12 w-full rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-50"
            >
              Save changes
            </button>
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
                <p className="text-sm text-muted-foreground">Sign in to add your name and character.</p>
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
