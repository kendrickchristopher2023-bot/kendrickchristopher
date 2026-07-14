import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { currentUserIsAdmin } from "@/lib/admin.functions";

/**
 * Floating shortcut to /admin. Renders only for the single owner account
 * (the one row in user_roles with role = 'admin'). Silent for everyone else.
 */
export function AdminButton() {
  const check = useServerFn(currentUserIsAdmin);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    check()
      .then((r) => {
        if (!cancelled) setIsAdmin(!!r.isAdmin);
      })
      .catch(() => {
        /* not signed in / transient — stay hidden */
      });
    return () => {
      cancelled = true;
    };
  }, [check]);

  if (!isAdmin) return null;

  return (
    <Link
      to="/admin"
      title="Admin dashboard"
      className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-background/90 px-3 py-2 text-xs font-medium text-foreground shadow-md backdrop-blur hover:bg-accent hover:text-accent-foreground"
    >
      <Shield className="h-4 w-4" />
      Admin
    </Link>
  );
}
