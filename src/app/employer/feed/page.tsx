import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { FeedClient, type Candidate } from "./FeedClient";

export default async function EmployerFeedPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const { data: candidates } = await supabase
    .from("candidates")
    .select("*, profiles(display_name)")
    .eq("is_visible", true)
    .order("composite_score", { ascending: false })
    .limit(100);

  return <FeedClient initialCandidates={(candidates as Candidate[] | null) ?? []} />;
}
