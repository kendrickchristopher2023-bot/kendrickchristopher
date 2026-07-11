import { createFileRoute, Outlet } from "@tanstack/react-router";

// Pathless layout for /apply/* — just renders children. The /apply landing
// page lives in apply.index.tsx.
export const Route = createFileRoute("/apply")({
  component: () => <Outlet />,
});
