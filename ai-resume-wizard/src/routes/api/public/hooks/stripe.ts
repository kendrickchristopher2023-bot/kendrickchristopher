// Stripe webhook — the ONLY thing that can grant or revoke a paid plan.
//
// Public route (external caller), so security is enforced in the handler:
// every request must carry a valid Stripe signature over the raw body.
// Writes go through the service role; `founder` is never touched.

import { createFileRoute } from "@tanstack/react-router";

type SubLike = {
  id?: string;
  status?: string;
  customer?: string;
  metadata?: Record<string, string>;
};

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);
const PAID_STATUSES = new Set(["active", "trialing"]);

export const Route = createFileRoute("/api/public/hooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"];
        if (!secret) {
          console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
          return new Response("not configured", { status: 500 });
        }

        const rawBody = await request.text();
        const { verifyStripeSignature, stripeRequest } = await import("@/lib/stripe.server");
        const verified = await verifyStripeSignature(
          rawBody,
          request.headers.get("stripe-signature"),
          secret,
        );
        if (!verified.ok) {
          console.warn("[stripe-webhook] rejected:", verified.reason);
          return new Response("invalid signature", { status: 400 });
        }

        const event = verified.event;
        const obj = event.data.object as Record<string, unknown>;

        try {
          let sub: SubLike | null = null;
          let userIdHint: string | null = null;
          let customerId: string | null = null;

          if (event.type === "checkout.session.completed") {
            customerId = (obj["customer"] as string | null) ?? null;
            userIdHint =
              (obj["client_reference_id"] as string | null) ??
              ((obj["metadata"] as Record<string, string> | undefined)?.[
                "supabase_user_id"
              ] ??
                null);
            const subId = obj["subscription"] as string | null;
            if (subId) {
              sub = await stripeRequest<SubLike>(`/subscriptions/${subId}`);
            }
          } else if (event.type.startsWith("customer.subscription.")) {
            sub = obj as SubLike;
            customerId = (sub.customer as string | null) ?? null;
            userIdHint = sub.metadata?.["supabase_user_id"] ?? null;
          } else {
            return Response.json({ received: true, ignored: event.type });
          }

          if (!sub) {
            return Response.json({ received: true, note: "no subscription on event" });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Resolve the user: metadata / client_reference_id first, then customer id.
          let userId = userIdHint;
          if (!userId && customerId) {
            const { data } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .eq("stripe_customer_id", customerId)
              .maybeSingle();
            userId = (data?.id as string | undefined) ?? null;
          }
          if (!userId) {
            console.warn("[stripe-webhook] could not map event to a user", event.id);
            return Response.json({ received: true, note: "unmapped customer" });
          }

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("plan, stripe_subscription_id")
            .eq("id", userId)
            .maybeSingle();

          const status =
            event.type === "customer.subscription.deleted"
              ? "canceled"
              : (sub.status ?? "unknown");
          const currentPlan = (profile?.plan as string | null) ?? "free";

          const update: Record<string, string | null> = {
            subscription_status: status,
          };
          if (customerId) update["stripe_customer_id"] = customerId;

          if (PAID_STATUSES.has(status)) {
            update["stripe_subscription_id"] = sub.id ?? null;
            // Never let a webhook set `founder`; only pro <-> free.
            if (currentPlan !== "founder") update["plan"] = "pro";
          } else if (ACTIVE_STATUSES.has(status)) {
            // past_due: keep access, just record the status.
            update["stripe_subscription_id"] = sub.id ?? null;
          } else {
            // canceled / unpaid / incomplete_expired -> back to free.
            const stored = profile?.stripe_subscription_id as string | null | undefined;
            const sameSub = !stored || !sub.id || stored === sub.id;
            if (sameSub) {
              if (currentPlan !== "founder") update["plan"] = "free";
              update["stripe_subscription_id"] = null;
            }
          }

          const { error } = await supabaseAdmin
            .from("profiles")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update(update as any)
            .eq("id", userId);
          if (error) {
            console.error("[stripe-webhook] profile update failed", error.message);
            return new Response("update failed", { status: 500 });
          }

          return Response.json({ received: true, type: event.type, status });
        } catch (e) {
          console.error("[stripe-webhook] handler error", e);
          return new Response("handler error", { status: 500 });
        }
      },
    },
  },
});
