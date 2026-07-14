import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Menu, X, Shield } from "lucide-react";
import { currentUserIsAdmin } from "@/lib/admin.functions";

type NavItem = {
  to: string;
  label: string;
  adminOnly?: boolean;
  icon?: typeof Shield;
};

const ITEMS: NavItem[] = [
  { to: "/apply", label: "Application Kit" },
  { to: "/apply/rewrite", label: "Rewrite" },
  { to: "/resume", label: "Resume" },
  { to: "/resumes", label: "Resume Tracks" },
  { to: "/settings", label: "Settings" },
  { to: "/help/getting-started", label: "Getting Started" },
  { to: "/help/faq", label: "FAQ" },
  { to: "/admin", label: "Admin", adminOnly: true, icon: Shield },
];

/**
 * Persistent top nav for every /_authenticated/* page.
 * Admin link only renders when the signed-in user actually has the admin
 * role — server-checked via currentUserIsAdmin, same as the (removed)
 * floating AdminButton.
 */
export function AppNav() {
  const check = useServerFn(currentUserIsAdmin);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancelled = false;
    check()
      .then((r) => !cancelled && setIsAdmin(!!r.isAdmin))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [check]);

  // Close the mobile sheet when the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const visible = ITEMS.filter((i) => !i.adminOnly || isAdmin);
  const isActive = (to: string) =>
    to === "/apply" ? pathname === "/apply" : pathname.startsWith(to);

  return (
    <>
      <nav className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-6xl items-center gap-1 px-4">
          <Link
            to="/apply"
            className="mr-2 text-sm font-semibold tracking-tight"
            title="Application Kit"
          >
            Kit
          </Link>
          <div className="hidden flex-1 items-center gap-1 md:flex">
            {visible.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors " +
                    (active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")
                  }
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="ml-auto md:hidden">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-foreground hover:bg-accent"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="border-t border-border bg-background md:hidden">
            <div className="mx-auto flex max-w-6xl flex-col px-2 py-2">
              {visible.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium " +
                      (active
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground hover:bg-accent/60")
                    }
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
