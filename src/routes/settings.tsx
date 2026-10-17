import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old address: settings now live inside Profile. */
export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [
    { title: "Account settings | LinguaRoots" },
    { name: "description", content: "Manage your LinguaRoots account settings in Profile." },
    { property: "og:title", content: "Account settings | LinguaRoots" },
    { property: "og:description", content: "Manage your LinguaRoots account settings in Profile." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/profile", replace: true });
  },
});
