-- ============================================================
-- 0010_realistic_hk_salary_seed.sql
-- Replace placeholder salary seed data with realistic 2026
-- Hong Kong market figures, across all five verticals.
-- Annual salary stored in cents (HKD).
--
-- Bands are anchored against C&SD wage survey levels and
-- Hays / Michael Page Hong Kong salary guide ranges:
--   tech      ~HKD 240K (0yr) -> ~HKD 1.5M (20yr)
--   finance   ~HKD 300K (0yr) -> ~HKD 2.65M (20yr)
--   marketing ~HKD 228K (0yr) -> ~HKD 1.38M (20yr)
--   design    ~HKD 246K (0yr) -> ~HKD 1.42M (20yr)
--   ops       ~HKD 216K (0yr) -> ~HKD 1.29M (20yr)
--
-- Curve shape: salary = (base + growth * years_exp^0.85) * noise
-- — concave growth (diminishing returns at senior levels), with
-- +/-15% per-point noise to give the regression realistic scatter.
-- ============================================================

delete from salary_data_points where source = 'seed';

insert into salary_data_points (vertical, years_exp, location, remote, annual_salary, source)
select
  v.vertical::vertical,
  yrs.years_exp,
  'Hong Kong',
  random() < 0.3,
  round((v.base + v.growth * power(yrs.years_exp, 0.85)) * (0.85 + random() * 0.30) * 100)::integer,
  'seed'
from (values
  ('tech',      240000, 99000),
  ('finance',   300000, 184000),
  ('marketing', 228000, 90000),
  ('design',    246000, 92000),
  ('ops',       216000, 84000)
) as v(vertical, base, growth)
cross join generate_series(0, 20) as yrs(years_exp)
cross join generate_series(1, 6) as n(n);
