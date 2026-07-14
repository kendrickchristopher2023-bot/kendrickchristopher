import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ChatAssistant } from "@/components/ChatAssistant";
import { AppNav } from "@/components/AppNav";

// Integration-managed protected layout. ssr:false because Supabase stores the
// session in localStorage, which the server can't read.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
    return { user: data.user };
  },
  component: () => (
    <>
      <AppNav />
      <Outlet />
      <ChatAssistant />
    </>
  ),
});
