import { supabase } from "@/integrations/supabase/client";

/** Clips ship with the app under /audio/<lang>/<file>; clips added later on the admin page live in Cloud storage at <lang>/<file>. */
export const AUDIO_BUCKET = "lesson-audio";

export function storagePathFor(url: string) {
  const m = url.match(/^\/audio\/([^/]+)\/(.+)$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

const isAudio = (r: Response) => r.ok && !(r.headers.get("content-type") ?? "").includes("text/html");

/** Returns the clip's bytes, or null when it isn't in the app or in storage. */
export async function fetchLessonAudio(url: string): Promise<Blob | null> {
  try {
    const r = await fetch(url);
    if (isAudio(r)) return await r.blob();
  } catch {
    /* try storage */
  }
  const path = storagePathFor(url);
  if (!path) return null;
  const { data } = await supabase.storage.from(AUDIO_BUCKET).download(path);
  return data ?? null;
}
