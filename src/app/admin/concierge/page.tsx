import { notFound } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { ConciergeClient } from "./ConciergeClient";
import type { Database } from "@/lib/supabase/types";

export type PostingWithEmployer = Database["public"]["Tables"]["employer_job_postings"]["Row"] & {
  employers: { company_name: string } | null;
};

export type CandidateForVerification = {
  id: string;
  composite_score: number;
  percentile_rank: number;
  is_founder_verified: boolean;
  profiles: { display_name: string } | null;
};

export type EmployerForAdmin = {
  id: string;
  company_name: string;
  profiles: { display_name: string; email: string } | null;
};

export default async function AdminConciergePage() {
  const session = await getServerSession();
  if (!session || !isAdminEmail(session.user.email)) {
    notFound();
  }

  const supabase = getSupabaseServiceClient();
  const [{ data: postings }, { count: matchSalaryPointCount }, { data: candidates }, { data: employers }] = await Promise.all([
    supabase
      .from("employer_job_postings")
      .select("*, employers(company_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("salary_data_points")
      .select("id", { count: "exact", head: true })
      .eq("source", "match"),
    supabase
      .from("candidates")
      .select("id, composite_score, percentile_rank, is_founder_verified, profiles(display_name)")
      .eq("is_visible", true)
      .order("composite_score", { ascending: false })
      .limit(100),
    supabase
      .from("employers")
      .select("id, company_name, profiles(display_name, email)")
      .order("company_name", { ascending: true }),
  ]);

  return (
    <ConciergeClient
      postings={(postings as PostingWithEmployer[] | null) ?? []}
      matchSalaryPointCount={matchSalaryPointCount ?? 0}
      candidates={(candidates as unknown as CandidateForVerification[] | null) ?? []}
      employers={(employers as unknown as EmployerForAdmin[] | null) ?? []}
    />
  );
}
