import { Link } from "@tanstack/react-router";
import { Home, UserRound, BookOpen } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background">
      <main className="flex-1 px-5 pb-28 pt-6">{children}</main>
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
    </div>
  );
}

function NavItem({ to, label, icon }: { to: "/" | "/dictionary" | "/profile"; label: string; icon: ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        activeOptions={{ exact: true }}
        className="flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm font-semibold text-muted-foreground data-[status=active]:text-primary"
        activeProps={{ "aria-current": "page" }}
      >
        {icon}
        <span>{label}</span>
      </Link>
    </li>
  );
}
