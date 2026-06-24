import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getServerSession } from "@/lib/auth/session";
import { FeedClient, type Candidate } from "./FeedClient";
import { UpgradePanel } from "./UpgradePanel";

export default async function EmployerFeedPage() {
  const session = await getServerSession();
  if (!session) return null;
  const supabase = getSupabaseServiceClient();

  const { data: employer } = await supabase
    .from("employers")
    .select("subscription_tier, subscription_status")
    .eq("id", session.user.id)
    .single();

  // subscription_status/subscription_tier/subscription_period_end are kept in
  // sync by /api/subscription/webhook (customer.subscription.created/updated/
  // deleted); they remain manually-settable as a fallback when Stripe keys
  // aren't configured.
  if (employer?.subscription_status !== "active") {
    return <UpgradePanel status={employer?.subscription_status ?? "canceled"} />;
  }

  const { data: candidates } = await supabase
    .from("candidates")
    .select("*, profiles(display_name), candidate_job_postings(title, location, work_eligible), candidate_portfolio_projects(id, title, description, link_url, file_name, skills)")
    .eq("is_visible", true)
    .order("composite_score", { ascending: false })
    .limit(100);

  return <FeedClient initialCandidates={(candidates as Candidate[] | null) ?? []} />;
}
