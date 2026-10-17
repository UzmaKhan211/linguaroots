import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, Check, Search, Sparkles, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DictionaryAudio } from "@/components/DictionaryAudio";
import { filterVocabulary, vocabulary, vocabularyAudioUrl, vocabularyCategories } from "@/lib/vocabulary";

export const Route = createFileRoute("/dictionary")({
  head: () => ({ meta: [
    { title: "Dictionary | LinguaRoots" },
    { name: "description", content: "Explore Khowar words, their meanings, and recordings by category." },
    { property: "og:title", content: "Dictionary | LinguaRoots" },
    { property: "og:description", content: "Explore Khowar words, their meanings, and recordings by category." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Dictionary,
});

function Dictionary() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const filtered = filterVocabulary(vocabulary, category, query);
  return <AppShell>
    <header className="fade-up">
      <div className="flex items-center gap-2 text-sm font-bold text-accent"><BookOpen className="size-5" aria-hidden /> Khowar</div>
      <h1 className="mt-2 text-4xl font-semibold">Dictionary</h1>
      <p className="mt-2 text-muted-foreground">Words for everyday conversations.</p>
    </header>
    <div className="relative mt-6">
      <Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" aria-hidden />
      <Input aria-label="Search words or meanings" placeholder="Search words or meanings" value={query} onChange={(e) => setQuery(e.target.value)} className="h-12 rounded-xl bg-card pl-10 pr-12 text-base md:text-base" />
      {query && <Button variant="ghost" size="icon" className="absolute right-1 top-1 size-10" aria-label="Clear search" onClick={() => setQuery("")}><X aria-hidden /></Button>}
    </div>
    <div aria-label="Word categories" className="dictionary-filters mt-4 flex gap-2 overflow-x-auto pb-3">
      {["All", ...vocabularyCategories].map((c) => <Button key={c} variant={category === c ? "default" : "secondary"} aria-pressed={category === c} onClick={() => setCategory(c)} className="min-h-11 shrink-0 rounded-full px-4">
        {category === c && <Check aria-hidden />} {c}
      </Button>)}
    </div>
    <p className="mb-3 mt-2 text-sm text-muted-foreground" aria-live="polite">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</p>
    <ul className="space-y-3">
      {filtered.map((w) => <li key={w.id} className="rounded-2xl border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-muted-foreground">{w.category}</span>
        </div>
        <h2 className="mt-2 break-words text-2xl font-semibold tracking-normal">{w.roman}<span className="ml-1 inline-block align-middle"><DictionaryAudio url={vocabularyAudioUrl(w)} word={w.roman} /></span></h2>
        <p className="mt-1 break-words text-base text-muted-foreground">{w.english}</p>
        {w.culturalNote && <details className="mt-3 border-t pt-3">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="size-4" aria-hidden /> Cultural insight</summary>
          <p className="mt-2 text-sm italic text-muted-foreground">{w.culturalNote}</p>
        </details>}
      </li>)}
    </ul>
    {filtered.length === 0 && <div className="py-12 text-center"><BookOpen className="mx-auto size-8 text-muted-foreground" aria-hidden /><p className="mt-3 font-semibold">No words found.</p><Button variant="link" className="min-h-11" onClick={() => { setCategory("All"); setQuery(""); }}>Show all words</Button></div>}
  </AppShell>;
}