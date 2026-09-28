// Same secret-gated aggregate feed, under the /api/public/* prefix so external
// machine callers reach it on the published site. Security is the Bearer token.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/owner/metrics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { handleOwnerMetricsRequest } = await import("@/lib/owner-metrics.server");
        return handleOwnerMetricsRequest(request);
      },
    },
  },
});
