-- 0035: Candidate experience months
--
-- The profile captures current experience as years + months (like the posting
-- form). years live in candidates.years_exp_claimed; the extra months go here.
-- Country of residence reuses the existing candidates.location column.

alter table candidates
  add column if not exists exp_months smallint;
