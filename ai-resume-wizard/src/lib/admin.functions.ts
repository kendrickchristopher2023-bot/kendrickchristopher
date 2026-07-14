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
    details,
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

    // If approved, mint a magic link the admin can send.
    if (data.approve) {
      const { data: req } = await context.supabase
        .from("access_requests")
        .select("email")
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
        return { ok: true, magicLink: link.properties?.action_link ?? null };
      }
    }
    return { ok: true, magicLink: null };
  });

export const grantAdminSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Bootstrap: first authenticated user can claim admin if no admins exist.
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Admin already exists");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: context.userId, role: "admin" },
        { onConflict: "user_id,role" },
      );
    if (error) throw error;
    return { ok: true };
  });

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
