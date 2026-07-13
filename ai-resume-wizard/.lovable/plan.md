# Connect Claude (and other AI clients) via MCP

Turn this app into an MCP server that Claude/ChatGPT/Codex can connect to. Because your data is private and per-user, we use OAuth: Claude signs in as you (through the app's existing login) and calls tools with your identity — RLS keeps everything scoped to your account. Same setup works for any future user.

## What Claude will be able to do

Tools exposed (all run as the signed-in user, RLS enforced):

1. `get_profile` — read your profile row
2. `get_resume` — read your stored resume (structured + raw text)
3. `update_resume` — replace/patch resume content
4. `list_matches` / `add_match` / `update_match_status` — manage your private job matches
5. `list_applications` / `add_application` / `update_application` — track applications
6. `tailor_resume` — given a JD (text or URL), return a tailored resume + cover letter draft (reuses existing `tailor.functions.ts` + AI gateway)
7. `generate_cover_letter` — cover letter for a JD using your resume
8. `generate_referral_dm` — reuses `referral.functions.ts`
9. `linkedin_optimize` — suggestions for your LinkedIn based on your resume + target role
10. `interview_prep_star` — STAR answers from your resume + JD
11. `draft_followup` — follow-up/thank-you email drafts for an application

All read tools are marked `readOnlyHint`; mutation tools are not, and destructive updates get `destructiveHint`.

## Build steps

### 1. Dependencies
- `bun add @lovable.dev/mcp-js zod`
- Add `@lovable.dev/mcp-js` to `minimumReleaseAgeExcludes` in `bunfig.toml`.

### 2. OAuth authorization server
- Call `supabase--configure_oauth_server` to activate Supabase as the OAuth 2.1 authorization server with dynamic client registration (so Claude can self-register).

### 3. Consent route
- Create `src/routes/[.]lovable.oauth.consent.tsx` with `ssr: false`.
- Uses the existing `supabase` browser client's `auth.oauth.getAuthorizationDetails/approveAuthorization/denyAuthorization`.
- If not signed in → redirect to `/auth` preserving the full consent URL as `next`; `auth.tsx` must consume `next` after password login, in `emailRedirectTo`, and in any social `redirect_uri` (update `src/routes/auth.tsx` accordingly).

### 4. MCP server module
- `src/lib/mcp/index.ts` — `defineMcp` with `auth: auth.oauth.issuer({ issuer: 'https://<VITE_SUPABASE_PROJECT_ID>.supabase.co/auth/v1', acceptedAudiences: 'authenticated' })`.
- One tool per file under `src/lib/mcp/tools/`, each building a per-user Supabase client from `ctx.getToken()` (so RLS runs as that user), reusing existing helpers from `src/lib/tailor.functions.ts`, `src/lib/referral.functions.ts`, `src/lib/ai-gateway.server.ts`.
- Do NOT read env vars at module scope — read inside handlers.
- Never use `supabaseAdmin` in MCP tools.

### 5. Vite plugin
- Add `mcpPlugin()` from `@lovable.dev/mcp-js/stacks/tanstack/vite` to `vite.config.ts` plugins. Mount at `/mcp` (project is published publicly, so default path works). Do NOT hand-write generated routes.

### 6. Manifest
- Run `app_mcp_server--extract_mcp_manifest` after tools are wired to publish the catalog for Lovable's Agent Integrations panel.

### 7. Favicon
- Add a simple favicon if missing (used as the connector icon).

## How you'll connect Claude after publish

1. Publish the app.
2. In Claude Desktop → Settings → Connectors → Add custom connector → paste `https://excel-ai-resume.lovable.app/mcp`.
3. Claude opens the OAuth flow → you sign in to your app → approve consent → Claude gets a user-scoped token.
4. Ask Claude things like "tailor my resume to this JD…" — it calls your app's tools as you.

Same flow works for ChatGPT (Custom GPT with MCP), Codex, Cursor.

## What stays out of scope (this turn)

- Interview prep, LinkedIn optimizer, follow-up drafts reuse the AI gateway with prompts inside the tool handlers — no new tables needed for v1. If you later want to store history (e.g., saved cover letters), we add tables then.
- The invite-only gate still applies to the web UI. MCP consent is gated by app login, so only approved users can grant Claude access — matching your invite-only posture.

## Files touched

- New: `src/lib/mcp/index.ts`, `src/lib/mcp/tools/*.ts` (~11 files), `src/routes/[.]lovable.oauth.consent.tsx`, maybe `public/favicon.ico`.
- Edited: `vite.config.ts`, `bunfig.toml`, `package.json`, `src/routes/auth.tsx` (consume `next`).
- Tool call: `supabase--configure_oauth_server`, then `app_mcp_server--extract_mcp_manifest`.

Approve and I'll build it.
