// Secret-gated aggregate metrics feed (no PII, read-only).
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/owner/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleOwnerMetricsRequest } = await import("@/lib/owner-metrics.server");
        return handleOwnerMetricsRequest(request);
      },
    },
  },
});
