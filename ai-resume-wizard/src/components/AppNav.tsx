import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X, Shield, Sparkles, Settings as SettingsIcon, LogOut, ChevronDown, User } from "lucide-react";
import { currentUserIsAdmin } from "@/lib/admin.functions";
import { getChangelogUnreadCount } from "@/lib/changelog.functions";
import { useSession, signOut } from "@/lib/session";

type NavItem = {
  to: string;
  label: string;
  match?: string[]; // additional pathname prefixes that should mark this as active
};

const ITEMS: NavItem[] = [
  { to: "/apply/discover", label: "Find Jobs" },
  { to: "/apply/matches", label: "My Jobs", match: ["/apply/go", "/apply/tailor", "/apply/interview-prep", "/apply/autofill", "/apply/referrals", "/apply/metrics"] },
  { to: "/resume", label: "My Resume", match: ["/resumes", "/apply/rewrite"] },
  { to: "/applications", label: "History" },
  { to: "/help/getting-started", label: "Help", match: ["/help/faq", "/help/"] },
];

export function AppNav() {
  const check = useServerFn(currentUserIsAdmin);
  const unreadFn = useServerFn(getChangelogUnreadCount);
  const { user } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
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
    setUserMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!userMenu) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenu]);

  const unreadQ = useQuery({
    queryKey: ["changelog-unread"],
    queryFn: () => unreadFn(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
  const unreadCount = unreadQ.data?.unreadCount ?? 0;

  const isActive = (item: NavItem) => {
    if (pathname === item.to) return true;
    if (pathname.startsWith(item.to + "/") || pathname.startsWith(item.to)) {
      // avoid /apply matching /apply/discover
      if (item.to === "/apply/discover" && !pathname.startsWith("/apply/discover")) return false;
    }
    if (pathname.startsWith(item.to)) return true;
    return (item.match ?? []).some((p) => pathname.startsWith(p));
  };

  const initials = (user?.email ?? "").slice(0, 1).toUpperCase() || "•";

  return (
    <nav className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-1 px-4">
        <Link
          to="/apply"
          className="mr-3 text-sm font-semibold tracking-tight"
          title="Home"
        >
          Kit
        </Link>
        <div className="hidden flex-1 items-center gap-1 md:flex">
          {ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User menu (desktop) */}
        <div className="ml-auto hidden md:block" ref={menuRef}>
          <button
            type="button"
            onClick={() => setUserMenu((v) => !v)}
            className="relative inline-flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
            aria-haspopup="menu"
            aria-expanded={userMenu}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {initials}
            </span>
            <span className="max-w-[160px] truncate">{user?.email ?? "Account"}</span>
            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} new`}
                className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
          {userMenu && (
            <div
              role="menu"
              className="absolute right-4 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-md"
            >
              <MenuLink to="/settings" icon={SettingsIcon} label="Settings" />
              <MenuLink to="/whats-new" icon={Sparkles} label="What's new" badge={unreadCount} />
              {isAdmin && <MenuLink to="/admin" icon={Shield} label="Admin" />}
              <MenuLink to="/apply" icon={User} label="Home dashboard" />
              <button
                type="button"
                onClick={() => {
                  setUserMenu(false);
                  signOut();
                }}
                className="mt-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-accent"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
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
            {ITEMS.map((item) => {
              const active = isActive(item);
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
                  {item.label}
                </Link>
              );
            })}
            <div className="my-2 border-t border-border" />
            <MenuLink to="/settings" icon={SettingsIcon} label="Settings" mobile />
            <MenuLink to="/whats-new" icon={Sparkles} label="What's new" badge={unreadCount} mobile />
            {isAdmin && <MenuLink to="/admin" icon={Shield} label="Admin" mobile />}
            <button
              type="button"
              onClick={() => signOut()}
              className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

function MenuLink({
  to,
  icon: Icon,
  label,
  badge,
  mobile,
}: {
  to: string;
  icon: typeof Shield;
  label: string;
  badge?: number;
  mobile?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        "flex items-center gap-2 rounded px-2 py-1.5 text-sm text-foreground hover:bg-accent " +
        (mobile ? "px-3 py-2" : "")
      }
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{label}</span>
      {badge && badge > 0 ? (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
