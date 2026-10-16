import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old address: settings now live inside Profile. */
export const Route = createFileRoute("/settings")({
  beforeLoad: () => {
    throw redirect({ to: "/profile", replace: true });
  },
});
