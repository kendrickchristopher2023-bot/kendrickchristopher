import { createFileRoute, redirect } from "@tanstack/react-router";

// Absorbed into /admin dashboard.
export const Route = createFileRoute("/_authenticated/_admin/admin/invites")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
  component: () => null,
});
