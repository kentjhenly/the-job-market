-- 0030: Per-user email notification preference
--
-- Controls activity emails only (new-pitch notifications to candidates,
-- match-accepted notifications to employers). Transactional emails (welcome,
-- email verification, password/email-change confirmations) always send,
-- regardless of this flag. Surfaced in the NOTIFICATIONS tab of
-- /candidate/settings and /employer/settings; gated at the email call sites
-- in /api/matches, /api/matches/[matchId]/respond, and /api/admin/matches.

alter table profiles
  add column email_notifications boolean not null default true;
