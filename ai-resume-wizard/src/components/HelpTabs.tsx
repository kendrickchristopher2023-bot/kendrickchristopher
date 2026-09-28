import { Link, useRouterState } from "@tanstack/react-router";

const TABS = [
  { to: "/help/getting-started", label: "Getting Started" },
  { to: "/help/faq", label: "FAQ" },
] as const;

export function HelpTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1 border-b border-border">
      {TABS.map((t) => {
        const active = pathname === t.to;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={
              "-mb-px inline-flex items-center rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors " +
              (active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
