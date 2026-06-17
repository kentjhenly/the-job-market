-- ============================================================
-- 0025_employer_subscriptions.sql
-- Employer subscription gating: an active subscription is now
-- required to browse the candidate feed and send pitches.
--
-- subscription_status/subscription_tier/subscription_period_end are
-- manually-settable for now -- no payment provider is wired up yet.
-- TODO(stripe): a webhook handler for customer.subscription.* events
-- should update these columns. See the TODO comments in
-- src/app/api/matches/route.ts and src/app/employer/feed/page.tsx.
--
-- Candidates are unaffected by this migration -- accepting a pitch
-- is now free (see the same commit's change to
-- src/app/api/matches/[matchId]/respond/route.ts, which stops
-- charging candidates.credits / candidates.free_accepts_used).
-- ============================================================

alter table employers
  add column subscription_tier text not null default 'none'
    check (subscription_tier in ('none', 'starter', 'pro')),
  add column subscription_status text not null default 'canceled'
    check (subscription_status in ('active', 'past_due', 'canceled')),
  add column subscription_period_end timestamptz;
