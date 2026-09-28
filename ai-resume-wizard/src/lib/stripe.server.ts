// Minimal Stripe REST client + helpers.
//
// We call Stripe's HTTP API directly with fetch instead of the `stripe` npm
// package: the SDK assumes a Node http stack, and this app's server code runs
// in a Cloudflare Worker. Form-encoded params, JSON responses, no deps.

const STRIPE_API = "https://api.stripe.com/v1";

/** Marker used to find (or create) the Application Kit price idempotently. */
export const PRO_PRICE_LOOKUP_KEY = "application_kit_pro_monthly";
export const PRO_PRODUCT_NAME = "Application Kit Pro";
export const PRO_UNIT_AMOUNT = 1900; // $19.00 USD
export const PRO_CURRENCY = "usd";

function secretKey(): string {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured. Add it in Project Settings → Secrets.");
  }
  return key;
}

/** Stripe wants PHP-style bracket form encoding for nested params. */
function encodeParams(params: Record<string, unknown>, prefix = "", out: string[] = []): string[] {
  for (const [rawKey, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const key = prefix ? `${prefix}[${rawKey}]` : rawKey;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === "object") {
          encodeParams(item as Record<string, unknown>, `${key}[${i}]`, out);
        } else {
          out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === "object") {
      encodeParams(value as Record<string, unknown>, key, out);
    } else {
      out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return out;
}

export async function stripeRequest<T = Record<string, unknown>>(
  path: string,
  init: {
    method?: "GET" | "POST" | "DELETE";
    params?: Record<string, unknown>;
    idempotencyKey?: string;
  } = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const body = init.params ? encodeParams(init.params).join("&") : undefined;
  const url = method === "GET" && body ? `${STRIPE_API}${path}?${body}` : `${STRIPE_API}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey()}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;

  const res = await fetch(url, {
    method,
    headers,
    body: method === "GET" ? undefined : body,
  });

  const json = (await res.json().catch(() => ({}))) as
    | T
    | { error?: { message?: string; type?: string } };

  if (!res.ok) {
    const message =
      (json as { error?: { message?: string } })?.error?.message ??
      `Stripe request failed (${res.status})`;
    console.error("[stripe]", path, res.status, message);
    throw new Error(message);
  }
  return json as T;
}

type StripeList<T> = { data: T[] };
type StripePrice = { id: string; active: boolean; lookup_key: string | null };
type StripeProduct = { id: string; name: string; active: boolean };

/**
 * Return the Application Kit Pro monthly price id, creating the product/price
 * once if it doesn't exist yet. Idempotent: looks up by lookup_key first, so
 * redeploys never spawn duplicates.
 */
export async function getOrCreateProPriceId(): Promise<string> {
  const configured = process.env["STRIPE_PRO_PRICE_ID"];
  if (configured) return configured;

  const existing = await stripeRequest<StripeList<StripePrice>>("/prices", {
    params: { "lookup_keys[0]": PRO_PRICE_LOOKUP_KEY, active: "true", limit: 1 },
  });
  if (existing.data[0]) return existing.data[0].id;

  // Reuse the product if it's already there (price may have been archived).
  const products = await stripeRequest<StripeList<StripeProduct>>("/products", {
    params: { active: "true", limit: 100 },
  });
  let productId = products.data.find((p) => p.name === PRO_PRODUCT_NAME)?.id;

  if (!productId) {
    const product = await stripeRequest<StripeProduct>("/products", {
      method: "POST",
      params: {
        name: PRO_PRODUCT_NAME,
        description:
          "Higher daily AI limits for tailoring, cover letters, interview prep and chat, plus the full resume rewrite tool.",
        metadata: { app: "application-kit", venture: "resume" },
      },
      idempotencyKey: "application-kit-pro-product-v1",
    });
    productId = product.id;
  }

  const price = await stripeRequest<StripePrice>("/prices", {
    method: "POST",
    params: {
      product: productId,
      unit_amount: PRO_UNIT_AMOUNT,
      currency: PRO_CURRENCY,
      recurring: { interval: "month" },
      lookup_key: PRO_PRICE_LOOKUP_KEY,
      metadata: { app: "application-kit", venture: "resume" },
    },
    idempotencyKey: "application-kit-pro-price-v1",
  });
  return price.id;
}

// ---------------------------------------------------------------------------
// Webhook signature verification (Web Crypto — Worker safe)
// ---------------------------------------------------------------------------

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

const TOLERANCE_SECONDS = 5 * 60;

/**
 * Verify a Stripe webhook signature over the RAW request body.
 * Returns the parsed event only when the signature checks out.
 */
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<{ ok: true; event: StripeEvent } | { ok: false; reason: string }> {
  if (!signatureHeader) return { ok: false, reason: "missing signature" };

  let timestamp = "";
  const signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [k, v] = part.trim().split("=");
    if (k === "t" && v) timestamp = v;
    if (k === "v1" && v) signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) {
    return { ok: false, reason: "malformed signature header" };
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

  if (!signatures.some((sig) => timingSafeEqualHex(sig, expected))) {
    return { ok: false, reason: "signature mismatch" };
  }

  try {
    return { ok: true, event: JSON.parse(rawBody) as StripeEvent };
  } catch {
    return { ok: false, reason: "invalid json" };
  }
}

export type StripeEvent = {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
};
