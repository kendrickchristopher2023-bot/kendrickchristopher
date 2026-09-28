import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationPrefs = {
  email_notifications: boolean;
};

export const getMyNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationPrefs> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("email_notifications")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return { email_notifications: data?.email_notifications ?? true };
  });

export const setMyNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ email_notifications: z.boolean() }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ email_notifications: data.email_notifications })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
