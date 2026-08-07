import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ChatAssistant } from "@/components/ChatAssistant";
import { AppNav } from "@/components/AppNav";
import { AppStatusBanner } from "@/components/AppStatusBanner";
import { IdleTimeout } from "@/components/IdleTimeout";

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
      <IdleTimeout />
      <AppStatusBanner />
      <AppNav />

      <Outlet />
      <AuthedFooter />
      <ChatAssistant />
    </>
  ),
});

function AuthedFooter() {
  return (
    <footer className="mx-auto mt-12 max-w-6xl px-4 pb-8 text-center text-xs text-muted-foreground">
      <a href="/legal" className="hover:text-foreground hover:underline">
        Terms &amp; Privacy
      </a>
    </footer>
  );
}
