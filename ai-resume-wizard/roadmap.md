# Roadmap

## Open

- **Stripe billing end-to-end test (TEST MODE) — BLOCKED**
  - Code is built & deployed (checkout, signed webhook, billing portal, Settings UI, column lockdown, founder protection).
  - Verified live: webhook rejects forged signature (400); `sk_` key + `STRIPE_WEBHOOK_SECRET` present; `OWNER_METRICS_KEY` works (owner metrics 200/401).
  - NOT done: full 4242 → Pro → cancel → free loop has never run.
    - The `$19/mo` price and "Application Kit Pro" product do not exist yet on the Stripe account (price lookup = 0). No user has a `stripe_customer_id`; nobody has ever flipped to `pro`.
  - **BLOCKER:** configured `STRIPE_SECRET_KEY` is a LIVE key (`sk_live_`), not the required test key (`sk_test_`). Will not run checkout against a live key — it could create a real charge.
  - Owner action: replace `STRIPE_SECRET_KEY` with `sk_test_...` and set a test-mode webhook signing secret. Then run the loop and write the Pro-plan changelog entry.
  - Pending deliverable: changelog entry "Pro plan and billing" (only after verified working).

- **Hold demo assets until films are final** — keep the Jordan Ellis demo account and the `demo-footage` storage files. No publish, no emails, no Stripe changes until Christopher confirms the films are final.

## Decided / closed
- **Saved resume rewrite usage change — REVERTED per Christopher (no-go).** The included rewrite is consumed when the AI produces the draft (original behavior); founders stay unlimited. Both What's New entries ("Your included resume rewrite is only used when you save it", "Clearer warning on invite links") stay unpublished.

## Recently completed
- Plan/quota restructure: `plan_expires_at` + `effective_plan()` as the single source of truth (app + SQL agree), free = monthly allowance, pro/founder = daily abuse guard, new signups default to free, identical re-tailoring reuses the saved session (no AI call, no usage), invite no longer duplicates access-request rows, admin "Remove" button on access requests (audit row only).

- Demo filming (Jordan Ellis, fictional data): 8 clips + contact sheets, uploaded, 7-day links. No publish, no real data.
- Owner metrics feed: live, secret-gated, aggregate-only.
- Session-security hardening, "sign out everywhere", 8h idle timeout, shared-computer reminder — published.
- Admin invite-link warning (copy-to-send, no local navigation).
- Resume rewrite "Notes for the AI" box + anti-fabrication.
- Duplicate-bullets-at-same-company fix (role-aware tailoring).
