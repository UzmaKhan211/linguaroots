import { Link } from "@tanstack/react-router";
import { Home, UserRound, BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import { RequireAccount } from "@/components/RequireAccount";
import { RewardsCounter } from "@/components/RewardsCounter";
import { LogoMark, Wordmark } from "@/components/LogoMark";

/** `lesson` hides the bottom bar so a stray tap cannot pull learners out mid-lesson. */
export function AppShell({ children, lesson = false }: { children: ReactNode; lesson?: boolean }) {
  return (
    <RequireAccount>
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background">
      {!lesson && (
        <>
          <header aria-label="LinguaRoots activity" className="fixed inset-x-0 top-0 z-20 mx-auto max-w-[440px] border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-5">
              <Link to="/" aria-label="LinguaRoots home" className="flex min-h-11 items-center gap-2"><LogoMark className="h-10 w-auto" /><Wordmark className="hidden h-4 w-auto min-[380px]:block" /></Link>
              <RewardsCounter />
            </div>
          </header>
          <div className="h-[calc(4rem+env(safe-area-inset-top))] shrink-0" aria-hidden />
        </>
      )}
      <main className={lesson ? "flex-1 px-5 pb-10 pt-6" : "flex-1 px-5 pb-28 pt-6"}>{children}</main>
      {!lesson && (
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[440px] border-t bg-card/95 backdrop-blur"
      >
        <ul className="grid grid-cols-3">
          <NavItem to="/" label="Home" icon={<Home className="size-6" aria-hidden />} />
          <NavItem to="/dictionary" label="Dictionary" icon={<BookOpen className="size-6" aria-hidden />} />
          <NavItem to="/profile" label="Profile" icon={<UserRound className="size-6" aria-hidden />} />
        </ul>
      </nav>
      )}
    </div>
    </RequireAccount>
  );
}

function NavItem({ to, label, icon }: { to: "/" | "/dictionary" | "/profile"; label: string; icon: ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        activeOptions={{ exact: true }}
        className="group relative flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-semibold text-muted-foreground transition-colors data-[status=active]:font-bold data-[status=active]:text-primary"
        activeProps={{ "aria-current": "page" }}
      >
        <span aria-hidden className="absolute inset-x-6 top-0 h-1 scale-x-0 rounded-b-full bg-primary transition-transform group-data-[status=active]:scale-x-100 motion-reduce:transition-none" />
        <span className="flex h-8 w-14 items-center justify-center rounded-full transition-colors group-data-[status=active]:bg-primary/15 [&>svg]:transition-transform group-data-[status=active]:[&>svg]:scale-110 group-data-[status=active]:[&>svg]:stroke-[2.5] motion-reduce:[&>svg]:transition-none">
          {icon}
        </span>
        <span>{label}</span>
      </Link>
    </li>
  );
}
