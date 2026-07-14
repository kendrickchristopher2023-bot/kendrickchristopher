import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { grantAdminSelf } from "@/lib/admin.functions";

// Bootstrap route: the FIRST signed-in user can claim admin here.
// Once an admin exists this always errors.
export const Route = createFileRoute("/_authenticated/_admin/admin/claim")({
  head: () => ({ meta: [{ title: "Claim admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: ClaimAdmin,
});

function ClaimAdmin() {
  const claim = useServerFn(grantAdminSelf);
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">Claim admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One-time. If no admin exists yet, click below to make this account the admin.
        </p>
        <button
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await claim();
              navigate({ to: "/admin" });
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Failed");
              setBusy(false);
            }
          }}
        >
          Make me admin
        </button>
        {msg && <p className="mt-3 text-sm text-destructive">{msg}</p>}
      </div>
    </main>
  );
}
