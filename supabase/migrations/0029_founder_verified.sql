-- 0029: Founder-verified candidate badge
--
-- Optional manual vouch from the founder for strong early candidates. Surfaces
-- a "VERIFIED" badge on the candidate's card in the employer feed. Settable
-- only via /admin/concierge (isAdminEmail allowlist) -- never by candidates.

alter table candidates
  add column is_founder_verified boolean not null default false;
