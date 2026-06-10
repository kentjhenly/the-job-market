import { redirect } from "next/navigation";
import { TopBar } from "@/components/terminal/TopBar";
import { Sidebar } from "@/components/terminal/Sidebar";
import { MatchTickerTape } from "@/components/terminal/MatchTickerTape";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/employer/dashboard", label: "DASHBOARD" },
  { href: "/employer/feed", label: "CANDIDATE FEED" },
  { href: "/employer/matches", label: "MATCHES" },
];

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");

  const role = (session.user as { role?: string }).role;
  if (role !== "employer") redirect("/dashboard");

  const supabase = await getSupabaseServerClient();
  const { data: employer } = await supabase
    .from("employers")
    .select("credits")
    .eq("id", session.user.id)
    .single();

  return (
    <div className="flex h-screen flex-col" style={{ background: "var(--bg)" }}>
      <TopBar
        homeHref="/employer/dashboard"
        stat={{ label: "CREDITS", value: String(employer?.credits ?? 0) }}
      />
      <MatchTickerTape />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar nav={NAV} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
