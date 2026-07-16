import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, Shield, Sparkles } from "lucide-react";
import { currentUserIsAdmin } from "@/lib/admin.functions";
import { getChangelogUnreadCount } from "@/lib/changelog.functions";

type NavItem = {
  to: string;
  label: string;
  adminOnly?: boolean;
  icon?: typeof Shield;
  badgeKey?: "changelog";
};

const ITEMS: NavItem[] = [
  { to: "/apply", label: "Application Kit" },
  { to: "/apply/discover", label: "Discover" },
  { to: "/apply/matches", label: "Job Matches" },
  { to: "/apply/rewrite", label: "Rewrite" },
  { to: "/resume", label: "Resume" },
  { to: "/resumes", label: "Resume Tracks" },
  { to: "/settings", label: "Settings" },
  { to: "/whats-new", label: "What's new", icon: Sparkles, badgeKey: "changelog" },
  { to: "/help/getting-started", label: "Getting Started" },
  { to: "/help/faq", label: "FAQ" },
  { to: "/admin", label: "Admin", adminOnly: true, icon: Shield },
];

export function AppNav() {
  const check = useServerFn(currentUserIsAdmin);
  const unreadFn = useServerFn(getChangelogUnreadCount);
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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const unreadQ = useQuery({
    queryKey: ["changelog-unread"],
    queryFn: () => unreadFn(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const unreadCount = unreadQ.data?.unreadCount ?? 0;

  const visible = ITEMS.filter((i) => !i.adminOnly || isAdmin);
  const isActive = (to: string) =>
    to === "/apply" ? pathname === "/apply" : pathname.startsWith(to);

  const renderBadge = (item: NavItem) => {
    if (item.badgeKey === "changelog" && unreadCount > 0) {
      return (
        <span
          aria-label={`${unreadCount} new`}
          className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      );
    }
    return null;
  };

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
                  {renderBadge(item)}
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
                    {renderBadge(item)}
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
