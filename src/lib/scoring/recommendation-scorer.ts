// Fires the recommendation-scorer Edge Function to recompute a candidate's
// composite_score after their portfolio changes. Non-blocking — the score
// will simply reflect the change on its next successful run.
export function triggerRecommendationScorer(candidateId: string) {
  const scorerUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/recommendation-scorer`;
  fetch(scorerUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ candidate_id: candidateId }),
  }).catch(() => {
    // Non-blocking — composite score will update on the next trigger
  });
}
