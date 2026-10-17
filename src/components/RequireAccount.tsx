import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

/** Learning needs an account: signed-out visitors go to the welcome flow before anything mounts. */
export function RequireAccount({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !user) void navigate({ to: "/welcome", replace: true });
  }, [ready, user, navigate]);
  return ready && user ? children : null;
}
