import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Shape returned to clients. Kept small on purpose — no created_by leak.
export type ChangelogEntry = {
  id: string;
  title: string;
  body: string;
  category: "new" | "improved" | "fixed";
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

async function writeAudit(
  adminUserId: string,
  action: string,
  targetId: string | null,
  details: Record<string, unknown>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("admin_audit_log").insert({
    admin_user_id: adminUserId,
    action,
    target_user_id: targetId,
    details: details as never,
  });
}

// -------- Reader (any signed-in user; RLS narrows to published) --------
export const listChangelog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    entries: ChangelogEntry[];
    seenAt: string | null;
    unreadCount: number;
  }> => {
    const { data, error } = await context.supabase
      .from("changelog")
      .select("id, title, body, category, published, published_at, created_at, updated_at")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: prof } = await context.supabase
      .from("profiles")
      .select("changelog_seen_at")
      .eq("id", context.userId)
      .maybeSingle();
    const seenAt = prof?.changelog_seen_at ?? null;

    const entries = (data ?? []) as ChangelogEntry[];
    const seenMs = seenAt ? new Date(seenAt).getTime() : 0;
    const unreadCount = entries.filter(
      (e) => e.published && e.published_at && new Date(e.published_at).getTime() > seenMs,
    ).length;

    return { entries, seenAt, unreadCount };
  });

// Lightweight badge count — separate from listChangelog so the nav can call
// it without pulling every entry body.
export const getChangelogUnreadCount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ unreadCount: number }> => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("changelog_seen_at")
      .eq("id", context.userId)
      .maybeSingle();
    const seenAt = prof?.changelog_seen_at ?? null;

    let q = context.supabase
      .from("changelog")
      .select("id", { count: "exact", head: true })
      .eq("published", true);
    if (seenAt) q = q.gt("published_at", seenAt);
    const { count, error } = await q;
    if (error) throw error;
    return { unreadCount: count ?? 0 };
  });

export const markChangelogSeen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true; seenAt: string }> => {
    const seenAt = new Date().toISOString();
    const { error } = await context.supabase
      .from("profiles")
      .update({ changelog_seen_at: seenAt })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true, seenAt };
  });

// -------- Admin authoring --------
const EntryInput = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  category: z.enum(["new", "improved", "fixed"]),
  published: z.boolean().default(false),
});

export const createChangelogEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EntryInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const publishedAt = data.published ? new Date().toISOString() : null;
    const { data: row, error } = await supabaseAdmin
      .from("changelog")
      .insert({
        title: data.title,
        body: data.body,
        category: data.category,
        published: data.published,
        published_at: publishedAt,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    await writeAudit(context.userId, "changelog_create", row.id, {
      title: data.title,
      published: data.published,
    });
    return { entry: row };
  });

const UpdateInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
  category: z.enum(["new", "improved", "fixed"]),
  published: z.boolean(),
});

export const updateChangelogEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Preserve original published_at when already published; set on transition
    // to published; clear when un-publishing.
    const { data: existing, error: readErr } = await supabaseAdmin
      .from("changelog")
      .select("published, published_at")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!existing) throw new Error("Not found");

    let publishedAt = existing.published_at as string | null;
    if (data.published && !existing.published) publishedAt = new Date().toISOString();
    if (!data.published) publishedAt = null;

    const { data: row, error } = await supabaseAdmin
      .from("changelog")
      .update({
        title: data.title,
        body: data.body,
        category: data.category,
        published: data.published,
        published_at: publishedAt,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;

    const action =
      data.published && !existing.published
        ? "changelog_publish"
        : !data.published && existing.published
          ? "changelog_unpublish"
          : "changelog_update";
    await writeAudit(context.userId, action, data.id, {
      title: data.title,
      published: data.published,
    });
    return { entry: row };
  });

export const deleteChangelogEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("changelog").delete().eq("id", data.id);
    if (error) throw error;
    await writeAudit(context.userId, "changelog_delete", data.id, {});
    return { ok: true };
  });
