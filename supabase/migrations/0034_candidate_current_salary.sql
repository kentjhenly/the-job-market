-- 0034: Candidate current salary
--
-- The candidate's current monthly salary (cents), set in the profile alongside
-- years of experience, so the dashboard SALARY POSITION panel can plot where
-- they sit against the market regression without depending on having a posting.

alter table candidates
  add column if not exists current_salary integer;
