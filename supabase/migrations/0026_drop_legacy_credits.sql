-- ============================================================
-- 0026_drop_legacy_credits.sql
-- Drop the per-transaction credit/free-trial columns made obsolete by
-- 0025_employer_subscriptions.sql.
--
-- Job posting creation (POST /api/employer-postings) and accepting a pitch
-- (POST /api/matches/[matchId]/respond) are now gated by
-- employers.subscription_status / are free respectively -- neither charges
-- these columns anymore, and no UI references them.
-- ============================================================

alter table employers
  drop column credits,
  drop column free_postings_used;

alter table candidates
  drop column credits,
  drop column free_accepts_used;
