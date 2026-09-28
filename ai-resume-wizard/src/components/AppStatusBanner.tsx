import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getAppStatus } from "@/lib/app-status.functions";

const DISMISS_KEY = "app-status-dismissed-at";

export function AppStatusBanner() {
  const fn = useServerFn(getAppStatus);
  const { data } = useQuery({
    queryKey: ["app-status"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const [dismissedAt, setDismissedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedAt(sessionStorage.getItem(DISMISS_KEY));
    } catch {
      // ignore
    }
  }, []);

  if (!data?.active) return null;
  // Dismiss is scoped to the current message's updated_at, so a new update re-shows the banner.
  if (dismissedAt && data.updated_at && dismissedAt === data.updated_at) {
    return null;
  }

  const onDismiss = () => {
    const stamp = data.updated_at ?? new Date().toISOString();
    try {
      sessionStorage.setItem(DISMISS_KEY, stamp);
    } catch {
      // ignore
    }
    setDismissedAt(stamp);
  };

  return (
    <div
      role="status"
      className="border-b border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-xs sm:text-sm">
        <span className="font-semibold uppercase tracking-wider">Notice</span>
        <span className="flex-1">
          {data.message?.trim() ||
            "Changes are being deployed — you may see brief interruptions."}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notice"
          className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-amber-500/20"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
