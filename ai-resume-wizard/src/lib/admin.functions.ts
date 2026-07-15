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
        });
        return { ok: true, magicLink, emailSent, emailError };
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
    });
    return {
      ok: true,
      email: req.email,
      magicLink,
      emailSent,
      emailError,
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
          .select("id, email, full_name, plan, created_at, onboarded_at")
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
    for (const u of authList.data?.users ?? []) {
      const untilRaw = (u as { banned_until?: string | null }).banned_until;
      const banned = !!untilRaw && new Date(untilRaw).getTime() > Date.now();
      bannedByUser.set(u.id, banned);
    }

    return {
      users: (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        plan: p.plan,
        created_at: p.created_at,
        onboarded_at: p.onboarded_at,
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
    await writeAudit(
      context.userId,
      data.revoked ? "user.access_revoked" : "user.access_restored",
      data.userId,
      {},
    );
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

    const [{ data: profs }, { data: usage }, { data: apps }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("created_at")
          .gte("created_at", sinceIso),
        supabaseAdmin.from("usage_daily").select("*").gte("day", sinceDay),
        supabaseAdmin.from("applications").select("stage"),
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
