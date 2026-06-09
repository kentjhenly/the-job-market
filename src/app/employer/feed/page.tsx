import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { FeedClient } from "./FeedClient";

export default async function EmployerFeedPage() {
  const session = await getServerSession();
  const supabase = await getSupabaseServerClient();
  if (!session) return null;

  const { data: candidates } = await supabase
    .from("candidates")
    .select("*, profiles(display_name)")
    .eq("is_visible", true)
    .order("composite_score", { ascending: false })
    .limit(100);

  const { data: employer } = await supabase
    .from("employers")
    .select("credits")
    .eq("id", session.user.id)
    .single();

  return (
    <FeedClient
      employerId={session.user.id}
      initialCandidates={(candidates as any) ?? []}
      employerCredits={employer?.credits ?? 0}
    />
  );
}
