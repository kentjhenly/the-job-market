-- ============================================================
-- 0022_seed_match_salary_points.sql
-- Replace the real-match salary points (backfilled by 0021 from
-- the 4 demo matches — only 1 qualified) with one match-sourced
-- point per seeded match_ticker_events row (200), so the
-- regression scatter shows a populated REAL MATCHES layer that
-- agrees with the public ticker tape.
--
-- Ticker events don't store years_exp, but delta_pct is defined
-- as the % the salary sits above/below the regression median for
-- that role at the (unstored) experience, so the experience is
-- recoverable: median(role, exp) ≈ salary / (1 + delta_pct/100);
-- pick the exp whose per-role seed median is closest. Every
-- derived number then stays consistent across surfaces: the dot
-- sits exactly delta_pct% off its role curve, at the salary the
-- ticker displays. role_label is taken from the seed table's
-- spelling (events store it uppercased) so role-level regression
-- filters (.eq on JOB_ROLES titles) keep matching.
--
-- Idempotent: delete-and-regenerate. Future accepted matches
-- still insert their own rows via /api/matches/[matchId]/respond.
-- ============================================================

delete from salary_data_points where source = 'match';

with role_medians as (
  select
    upper(role_label) as role_u,
    role_label,
    vertical,
    years_exp,
    percentile_cont(0.5) within group (order by monthly_salary) as med
  from salary_data_points
  where source = 'seed' and role_label is not null
  group by role_label, vertical, years_exp
),
recovered as (
  select
    e.vertical,
    rm.role_label as seed_role_label,
    rm.years_exp,
    e.salary,
    e.created_at,
    row_number() over (
      partition by e.id
      order by abs(rm.med - e.salary / (1 + coalesce(e.delta_pct, 0) / 100.0))
    ) as rn
  from match_ticker_events e
  join role_medians rm
    on rm.role_u = upper(e.role_label) and rm.vertical = e.vertical
  where e.salary is not null
)
insert into salary_data_points
  (vertical, role_label, years_exp, location, remote, monthly_salary, source, created_at)
select
  r.vertical,
  r.seed_role_label,
  r.years_exp,
  'Hong Kong',
  random() < 0.3,
  r.salary,
  'match',
  r.created_at
from recovered r
where r.rn = 1;
