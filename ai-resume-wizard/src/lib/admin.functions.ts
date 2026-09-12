import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function writeAudit(
  adminUserId: string,
  action: string,
  targetUserId: string | null,
  details: Record<string, unknown>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: adminUserId,
    action,
    target_user_id: targetUserId,
    details: details as never,
  });
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export const listAccessRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("access_requests")
      .select("*")
      .order("requested_at", { ascending: false });
    if (error) throw error;
    return { requests: data ?? [] };
  });

export const reviewAccessRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; approve: boolean }) =>
    z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const status = data.approve ? "approved" : "denied";
    const { error } = await context.supabase
      .from("access_requests")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw error;

    // If approved, mint a magic link and email it to the requester.
    if (data.approve) {
      const { data: req } = await context.supabase
        .from("access_requests")
        .select("email, full_name")
        .eq("id", data.id)
        .single();
      if (req) {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        const origin = process.env.APP_URL || "http://localhost:8080";
        const { data: link, error: linkErr } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email: req.email,
            options: { redirectTo: `${origin}/auth` },
          });
        if (linkErr) throw linkErr;
        const magicLink = link.properties?.action_link ?? null;

        let emailSent = false;
        let emailError: string | null = null;
        let emailMessageId: string | null = null;
        if (magicLink) {
          try {
            const { sendTemplateEmail } = await import(
              "@/lib/email-templates/send-email"
            );
            const result = await sendTemplateEmail(
              "access-approved",
              req.email,
              {
                templateData: {
                  magicLink,
                  fullName: (req as { full_name?: string | null }).full_name ?? null,
                },
                idempotencyKey: `access-approved-${data.id}`,
              },
            );
            emailSent = result.sent;
            emailMessageId = result.messageId ?? null;
            if (!result.sent) emailError = result.reason;
          } catch (err) {
            emailError = err instanceof Error ? err.message : String(err);
            console.error("[admin] access-approved email failed", err);
          }
        }

        await writeAudit(context.userId, "access_request.approved", null, {
          access_request_id: data.id,
          email: req.email,
          email_sent: emailSent,
          email_error: emailError,
          email_message_id: emailMessageId,
        });
        return { ok: true, magicLink, emailSent, emailError, emailMessageId };
      }
    }
    await writeAudit(context.userId, `access_request.${status}`, null, {
      access_request_id: data.id,
    });
    return { ok: true, magicLink: null, emailSent: false, emailError: null };
  });

export const resendAccessLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: req, error: reqErr } = await context.supabase
      .from("access_requests")
      .select("email, full_name, status")
      .eq("id", data.id)
      .single();
    if (reqErr || !req) throw reqErr ?? new Error("Not found");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const origin = process.env.APP_URL || "http://localhost:8080";
    const { data: link, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: req.email,
        options: { redirectTo: `${origin}/auth` },
      });
    if (linkErr) throw linkErr;
    const magicLink = link.properties?.action_link ?? null;

    let emailSent = false;
    let emailError: string | null = null;
    let emailMessageId: string | null = null;
    if (magicLink) {
      try {
        const { sendTemplateEmail } = await import(
          "@/lib/email-templates/send-email"
        );
        const result = await sendTemplateEmail("access-approved", req.email, {
          templateData: {
            magicLink,
            fullName:
              (req as { full_name?: string | null }).full_name ?? null,
          },
          idempotencyKey: `access-resend-${data.id}-${Date.now()}`,
        });
        emailSent = result.sent;
        emailMessageId = result.messageId ?? null;
        if (!result.sent) emailError = result.reason;
      } catch (err) {
        emailError = err instanceof Error ? err.message : String(err);
        console.error("[admin] access-resend email failed", err);
      }
    }

    await writeAudit(context.userId, "access_request.link_resent", null, {
      access_request_id: data.id,
      email: req.email,
      prior_status: req.status,
      email_sent: emailSent,
      email_error: emailError,
      email_message_id: emailMessageId,
    });
    return {
      ok: true,
      email: req.email,
      magicLink,
      emailSent,
      emailError,
      emailMessageId,
    };
  });

// Admin is provisioned manually in the database — there is no self-serve
// claim endpoint. Only the single owner account holds the `admin` role.


export const currentUserIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });

const PLAN_VALUES = ["free", "pro", "founder"] as const;

export const inviteUserByEmailAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { email: string; full_name?: string | null; plan?: (typeof PLAN_VALUES)[number] }) =>
      z
        .object({
          email: z.string().trim().toLowerCase().email().max(254),
          full_name: z.string().trim().max(200).optional().nullable(),
          plan: z.enum(PLAN_VALUES).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const origin = process.env.APP_URL || "https://excel-ai-resume.lovable.app";
    const redirectTo = `${origin}/auth`;

    // Determine if the auth user already exists (paginate to find them).
    let existingUserId: string | null = null;
    let page = 1;
    while (page <= 20) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw error;
      const users = list?.users ?? [];
      const match = users.find(
        (u) => (u.email ?? "").toLowerCase() === data.email,
      );
      if (match) {
        existingUserId = match.id;
        break;
      }
      if (users.length < 200) break;
      page += 1;
    }

    let mode: "invite" | "magiclink" = existingUserId ? "magiclink" : "invite";
    let linkResp = await supabaseAdmin.auth.admin.generateLink({
      type: mode,
      email: data.email,
      options: { redirectTo },
    });
    if (linkResp.error) {
      // Fallback: if invite fails because the user already exists, try magic link.
      if (mode === "invite") {
        mode = "magiclink";
        linkResp = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: data.email,
          options: { redirectTo },
        });
        if (linkResp.error) throw linkResp.error;
      } else {
        throw linkResp.error;
      }
    }
    const magicLink = linkResp.data?.properties?.action_link ?? null;
    const userId: string | null =
      existingUserId ?? (linkResp.data?.user?.id as string | undefined) ?? null;

    // Set the plan if requested and not the default `free`. Row is created by
    // the profiles trigger when the auth user is created; retry briefly.
    if (userId && data.plan && data.plan !== "free") {
      for (let i = 0; i < 5; i += 1) {
        const { error: planErr } = await supabaseAdmin
          .from("profiles")
          .update({ plan: data.plan })
          .eq("id", userId);
        if (!planErr) break;
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    // Persist full_name on the profile if provided (only for freshly-created users).
    if (userId && data.full_name && !existingUserId) {
      await supabaseAdmin
        .from("profiles")
        .update({ full_name: data.full_name })
        .eq("id", userId);
    }

    // Record in access_requests so invites show up in the same audit trail.
    const { data: reqRow } = await supabaseAdmin
      .from("access_requests")
      .insert({
        email: data.email,
        full_name: data.full_name ?? null,
        reason: `[admin invite] plan=${data.plan ?? "free"}`,
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .select("id")
      .single();

    let emailSent = false;
    let emailError: string | null = null;
    let emailMessageId: string | null = null;
    if (magicLink) {
      try {
        const { sendTemplateEmail } = await import(
          "@/lib/email-templates/send-email"
        );
        const result = await sendTemplateEmail("access-approved", data.email, {
          templateData: {
            magicLink,
            fullName: data.full_name ?? null,
          },
          idempotencyKey: `admin-invite-${reqRow?.id ?? data.email}-${Date.now()}`,
        });
        emailSent = result.sent;
        emailMessageId = result.messageId ?? null;
        if (!result.sent) emailError = result.reason;
      } catch (err) {
        emailError = err instanceof Error ? err.message : String(err);
        console.error("[admin] invite email failed", err);
      }
    }

    await writeAudit(context.userId, "user.invited", userId, {
      email: data.email,
      plan: data.plan ?? "free",
      mode,
      existing_user: !!existingUserId,
      access_request_id: reqRow?.id ?? null,
      email_sent: emailSent,
      email_error: emailError,
      email_message_id: emailMessageId,
    });

    return {
      ok: true,
      email: data.email,
      magicLink,
      emailSent,
      emailError,
      emailMessageId,
      mode,
      existingUser: !!existingUserId,
    };
  });
type PlanTier = (typeof PLAN_VALUES)[number];

export const listUsersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const [{ data: profiles }, { data: resumes }, { data: usage }, authList] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("id, email, full_name, plan, created_at, onboarded_at, last_active_at")
          .eq("is_demo", false)
          .order("created_at", { ascending: false }),

        supabaseAdmin
          .from("resumes")
          .select("user_id, is_primary")
          .eq("is_primary", true),
        supabaseAdmin
          .from("usage_daily")
          .select("*")
          .eq("day", new Date().toISOString().slice(0, 10)),
        supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);

    const primaryByUser = new Set((resumes ?? []).map((r) => r.user_id));
    const usageByUser = new Map<string, number>();
    for (const row of usage ?? []) {
      const total =
        (row.tailor_count ?? 0) +
        (row.cover_letter_count ?? 0) +
        (row.interview_prep_count ?? 0) +
        (row.linkedin_count ?? 0) +
        (row.referral_dm_count ?? 0) +
        (row.parse_resume_count ?? 0) +
        (row.chat_count ?? 0);
      usageByUser.set(row.user_id, total);
    }
    const bannedByUser = new Map<string, boolean>();
    const lastSignInByUser = new Map<string, string | null>();
    for (const u of authList.data?.users ?? []) {
      const untilRaw = (u as { banned_until?: string | null }).banned_until;
      const banned = !!untilRaw && new Date(untilRaw).getTime() > Date.now();
      bannedByUser.set(u.id, banned);
      lastSignInByUser.set(u.id, (u as { last_sign_in_at?: string | null }).last_sign_in_at ?? null);
    }

    return {
      users: (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        plan: p.plan,
        created_at: p.created_at,
        onboarded_at: p.onboarded_at,
        last_active_at: p.last_active_at,
        last_sign_in_at: lastSignInByUser.get(p.id) ?? null,
        has_primary_resume: primaryByUser.has(p.id),
        usage_today: usageByUser.get(p.id) ?? 0,
        banned: bannedByUser.get(p.id) ?? false,
      })),
    };
  });


export const updateUserPlanAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; plan: PlanTier }) =>
    z
      .object({ userId: z.string().uuid(), plan: z.enum(PLAN_VALUES) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ plan: data.plan })
      .eq("id", data.userId);
    if (error) throw error;
    await writeAudit(context.userId, "user.plan_changed", data.userId, {
      plan: data.plan,
    });
    return { ok: true };
  });

export const setUserAccessAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; revoked: boolean }) =>
    z
      .object({ userId: z.string().uuid(), revoked: z.boolean() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("You can't revoke your own access.");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      data.userId,
      // 100 years to revoke, "none" to restore. Sign-in is blocked while banned;
      // no data is deleted.
      { ban_duration: data.revoked ? "876000h" : "none" } as never,
    );
    if (error) throw error;
    // On revoke, also invalidate any active sessions so existing access tokens
    // stop working immediately instead of surviving until their ~1h expiry.
    if (data.revoked) {
      try {
        await supabaseAdmin.auth.admin.signOut(data.userId, "global");
      } catch (err) {
        console.error("[admin] signOut on revoke failed", err);
      }
    }
    await writeAudit(
      context.userId,
      data.revoked ? "user.access_revoked" : "user.access_restored",
      data.userId,
      {},
    );
    return { ok: true };
  });

export const deleteUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; email: string }) =>
    z.object({ userId: z.string().uuid(), email: z.string().email() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("You can't delete your own account.");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // Audit BEFORE delete so the target_user_id/email is retained even after
    // the auth user (and cascading profile rows) are gone.
    await writeAudit(context.userId, "user.deleted", data.userId, {
      email: data.email,
    });
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const listAdminAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    const userIds = Array.from(
      new Set(
        (data ?? [])
          .flatMap((r) => [r.admin_user_id, r.target_user_id])
          .filter((v): v is string => !!v),
      ),
    );
    let emailById = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .in("id", userIds);
      emailById = new Map((profs ?? []).map((p) => [p.id, p.email]));
    }
    return {
      entries: (data ?? []).map((r) => ({
        id: r.id,
        action: r.action,
        created_at: r.created_at,
        details: r.details,
        admin_email: emailById.get(r.admin_user_id) ?? r.admin_user_id,
        target_email: r.target_user_id
          ? (emailById.get(r.target_user_id) ?? r.target_user_id)
          : null,
      })),
    };
  });

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString();
    const sinceDay = sinceIso.slice(0, 10);

    // Demo/filming accounts (profiles.is_demo) are excluded from analytics.
    const { data: demoRows } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("is_demo", true);
    const demoIds = (demoRows ?? []).map((r) => r.id);
    const notDemo = `(${demoIds.join(",")})`;

    const [{ data: profs }, { data: usage }, { data: apps }] =
      await Promise.all([
        (() => {
          let q = supabaseAdmin
            .from("profiles")
            .select("created_at")
            .eq("is_demo", false)
            .gte("created_at", sinceIso);
          return q;
        })(),
        (() => {
          let q = supabaseAdmin.from("usage_daily").select("*").gte("day", sinceDay);
          if (demoIds.length) q = q.not("user_id", "in", notDemo);
          return q;
        })(),
        (() => {
          let q = supabaseAdmin.from("applications").select("stage");
          if (demoIds.length) q = q.not("user_id", "in", notDemo);
          return q;
        })(),
      ]);


    const signupsByDay = new Map<string, number>();
    for (const p of profs ?? []) {
      const day = (p.created_at as string).slice(0, 10);
      signupsByDay.set(day, (signupsByDay.get(day) ?? 0) + 1);
    }
    const signups = Array.from(signupsByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count }));

    const totals = {
      tailor: 0,
      cover_letter: 0,
      interview_prep: 0,
      linkedin: 0,
      referral_dm: 0,
      parse_resume: 0,
      chat: 0,
    };
    for (const row of usage ?? []) {
      totals.tailor += row.tailor_count ?? 0;
      totals.cover_letter += row.cover_letter_count ?? 0;
      totals.interview_prep += row.interview_prep_count ?? 0;
      totals.linkedin += row.linkedin_count ?? 0;
      totals.referral_dm += row.referral_dm_count ?? 0;
      totals.parse_resume += row.parse_resume_count ?? 0;
      totals.chat += row.chat_count ?? 0;
    }

    const funnel: Record<string, number> = {};
    for (const a of apps ?? []) {
      funnel[a.stage] = (funnel[a.stage] ?? 0) + 1;
    }

    return { signups, usageTotals: totals, funnel };
  });
