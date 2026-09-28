import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export const getAppStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("app_status")
      .select("active, message, updated_at")
      .eq("id", true)
      .maybeSingle();
    if (error) throw error;
    return {
      active: !!data?.active,
      message: (data?.message as string | null) ?? null,
      updated_at: (data?.updated_at as string | null) ?? null,
    };
  });

export const setAppStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { active: boolean; message?: string | null }) =>
    z
      .object({
        active: z.boolean(),
        message: z.string().max(500).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("app_status")
      .update({
        active: data.active,
        message: data.message ?? null,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      })
      .eq("id", true);
    if (error) throw error;

    await supabaseAdmin.from("admin_audit_log").insert({
      admin_user_id: context.userId,
      action: "app_status.updated",
      target_user_id: null,
      details: { active: data.active, message: data.message ?? null } as never,
    });
    return { ok: true };
  });
