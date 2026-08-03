import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BillingStatus = {
  plan: "free" | "pro" | "founder";
  subscriptionStatus: string | null;
  hasSubscription: boolean;
  priceUsd: number;
};

function appOrigin(): string {
  const req = getRequest();
  return new URL(req.url).origin;
}

export const getMyBillingStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BillingStatus> => {
    const { data } = await context.supabase
      .from("profiles")
      .select("plan, subscription_status, stripe_subscription_id")
      .eq("id", context.userId)
      .maybeSingle();
    const raw = (data?.plan as string | null) ?? "free";
    const plan = raw === "pro" || raw === "founder" ? raw : "free";
    return {
      plan,
      subscriptionStatus: (data?.subscription_status as string | null) ?? null,
      hasSubscription: Boolean(data?.stripe_subscription_id),
      priceUsd: 19,
    };
  });

/**
 * Create a Stripe Checkout Session for the Pro monthly subscription.
 * Landing on the success URL grants nothing — only the verified webhook
 * flips a profile to `pro`.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { stripeRequest, getOrCreateProPriceId } = await import("@/lib/stripe.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name, plan, stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (profile?.plan === "pro" || profile?.plan === "founder") {
      throw new Error("You're already on a paid plan.");
    }

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripeRequest<{ id: string }>("/customers", {
        method: "POST",
        params: {
          email: profile?.email ?? undefined,
          name: profile?.full_name ?? undefined,
          metadata: { supabase_user_id: context.userId, app: "application-kit" },
        },
        idempotencyKey: `ak-customer-${context.userId}`,
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", context.userId);
    }

    const price = await getOrCreateProPriceId();
    const origin = appOrigin();

    const session = await stripeRequest<{ url: string | null }>("/checkout/sessions", {
      method: "POST",
      params: {
        mode: "subscription",
        customer: customerId,
        client_reference_id: context.userId,
        "line_items[0][price]": price,
        "line_items[0][quantity]": 1,
        allow_promotion_codes: "true",
        success_url: `${origin}/settings?upgraded=1`,
        cancel_url: `${origin}/settings`,
        subscription_data: {
          metadata: { supabase_user_id: context.userId, app: "application-kit" },
        },
        metadata: { supabase_user_id: context.userId, app: "application-kit" },
      },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return { url: session.url };
  });

/** Stripe Billing Portal so users can cancel or update their card themselves. */
export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { stripeRequest } = await import("@/lib/stripe.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", context.userId)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      throw new Error("No billing account on file yet.");
    }

    const session = await stripeRequest<{ url: string }>("/billing_portal/sessions", {
      method: "POST",
      params: {
        customer: profile.stripe_customer_id,
        return_url: `${appOrigin()}/settings`,
      },
    });
    return { url: session.url };
  });
