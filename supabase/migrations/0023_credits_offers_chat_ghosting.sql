-- ============================================================
-- 0023_credits_offers_chat_ghosting.sql
-- New revenue model + hire-offer flow + chat-ghosting:
--
--  - Employers spend credits to CREATE job postings (first 3
--    free trial); pitching candidates from the feed is now free.
--  - Candidates spend credits to ACCEPT a pitch (first 3 free
--    trial).
--  - Accepted matches can progress to a hire offer, tracked via
--    matches.offer_status / offer_salary / offer_sent_at /
--    hired_at and confirmed through the candidate's multi-step
--    accept/decline UI.
--  - Chat activity is tracked via matches.last_message_at so the
--    expire-matches cron can ghost accepted matches with no
--    activity in 72h (responded_at is the baseline before the
--    first message).
-- ============================================================

alter table candidates
  add column credits integer not null default 0,
  add column free_accepts_used integer not null default 0;

alter table employers
  add column free_postings_used integer not null default 0;

alter table matches
  add column offer_status text check (offer_status in ('pending', 'accepted', 'declined')),
  add column offer_salary integer,       -- cents; employer's final hire offer
  add column offer_sent_at timestamptz,
  add column hired_at timestamptz,
  add column last_message_at timestamptz;

alter table match_messages
  add column message_type text not null default 'text'
    check (message_type in ('text', 'offer', 'offer_accepted', 'offer_declined'));
