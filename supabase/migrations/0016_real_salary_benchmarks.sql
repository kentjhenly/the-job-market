-- ============================================================
-- 0016_real_salary_benchmarks.sql
-- Reseed salary_data_points with curves calibrated to REAL
-- published Hong Kong salary benchmarks (June 2026), replacing
-- the synthetic 0015 seed. source='match' rows (real accepted
-- offers) are untouched.
--
-- Model: monthly_salary(yrs) = base + growth * yrs^0.85, ±10% noise.
-- For each role, `base` = published entry-level monthly salary and
-- `growth` is solved so the curve passes through the published
-- 10-year / senior figure: growth = (senior10yr - base) / 10^0.85.
-- All figures are MONTHLY HKD; stored as cents.
--
-- Benchmark sources (all monthly HKD unless noted):
--  [C&SD]  2025 Annual Earnings and Hours Survey — all-occupation
--          median monthly wage HKD 21,200 (May–Jun 2025).
--          https://www.info.gov.hk/gia/general/202603/23/P2026032300370.htm
--  [MM]    Morgan McKinley HK Salary Guide 2026 (low/median/high):
--          Financial Analyst 33–38 / 46–47 / 50–60K
--          Compliance Officer 25 / 40 / 50K
--          Data Engineer 30 / 50 / 70K
--          UX Designer 25 / 45 / 70K
--          Digital Marketing Manager ~55K · Marketing Director ~80K
--          Logistic & Operations Manager ~50K
--          https://www.morganmckinley.com/hk/salary-guide
--  [JDB]   JobsDB HK salary pages (Jun 2026, employer-disclosed ads):
--          Software Engineer 32.5–43.75K by district
--          Accountant 27.5–32.75K (entry clerk 20–28K)
--          Logistics Manager 30–40K · Supply Chain Manager 36–46K
--          https://hk.jobsdb.com/career-advice/role/software-engineer/salary
--  [PS]    PayScale 2026 (annual → /12): Portfolio Manager ~953.7K/yr
--          (~79.5K/mo) · Marketing Manager ~464.6K/yr (~38.7K/mo) ·
--          Logistics Manager ~397.8K/yr (~33K/mo)
--  [GD]    Glassdoor 2026: Investment Banking Analyst ~1.205M/yr
--          (~100K/mo), p25–p75 820K–1.42M/yr
--  [WITS]  whatisthesalary.com HK SE guide 2026 (annual bands):
--          junior 192–420K · mid 420–660K · senior 660K–1M+
-- ============================================================

delete from salary_data_points where source = 'seed';

insert into salary_data_points (vertical, role_label, years_exp, location, remote, monthly_salary, source)
select
  r.vertical::vertical,
  r.role_label,
  yrs.years_exp,
  'Hong Kong',
  random() < 0.3,
  round((r.base + r.growth * power(yrs.years_exp, 0.85)) * (0.90 + random() * 0.20) * 100)::integer,
  'seed'
from (values
  -- (vertical, role_label, base = entry monthly HKD, growth)
  -- tech: anchored to [JDB] SE district data, [WITS] bands, [MM] Data Engineer
  ('tech', 'Fullstack Engineer',                 20000,  5368),
  ('tech', 'Backend Engineer',                   21000,  5791),
  ('tech', 'Mobile Engineer',                    21000,  5509),
  ('tech', 'Senior Frontend Engineer',           24000,  5791),
  ('tech', 'Data Engineer',                      30000,  5085),
  ('tech', 'ML Engineer',                        32000,  6498),
  ('tech', 'Platform Engineer',                  30000,  5933),
  ('tech', 'Site Reliability Engineer',          30000,  5933),
  ('tech', 'Security Engineer',                  32000,  6074),
  ('tech', 'Staff Engineer',                     38000,  8051),

  -- finance: anchored to [MM] FA/Compliance, [JDB] Accountant, [GD] IB, [PS] PM
  ('finance', 'Accountant',                      20000,  3531),
  ('finance', 'Financial Analyst',               30000,  3955),
  ('finance', 'Compliance Officer',              25000,  3814),
  ('finance', 'Risk Analyst',                    27000,  4096),
  ('finance', 'Equity Research Analyst',         35000,  5650),
  ('finance', 'Investment Banking Analyst',      55000, 10594),
  ('finance', 'Financial Controller',            40000,  7769),
  ('finance', 'Portfolio Manager',               45000,  9181),

  -- marketing: anchored to [PS] Marketing Manager, [MM] DMM/Director
  ('marketing', 'Social Media Manager',          16000,  2684),
  ('marketing', 'SEO Specialist',                17000,  2825),
  ('marketing', 'Content Marketing Manager',     20000,  3390),
  ('marketing', 'Marketing Analyst',             20000,  3531),
  ('marketing', 'Performance Marketing Manager', 23000,  3814),
  ('marketing', 'Brand Manager',                 25000,  4238),
  ('marketing', 'Growth Marketing Lead',         28000,  4802),
  ('marketing', 'Marketing Director',            35000,  6357),

  -- design: anchored to [MM] UX Designer 25/45/70K
  ('design', 'Visual Designer',                  18000,  2825),
  ('design', 'UI Designer',                      20000,  3390),
  ('design', 'UX Designer',                      25000,  4238),
  ('design', 'Product Designer',                 26000,  4802),
  ('design', 'UX Researcher',                    26000,  4520),
  ('design', 'Brand Designer',                   20000,  3390),
  ('design', 'Design Systems Lead',              32000,  5368),
  ('design', 'Design Director',                  38000,  6639),

  -- ops: anchored to [JDB] Logistics/Supply Chain, [MM] L&O Manager, [C&SD] median
  ('ops', 'Logistics Coordinator',               15000,  2119),
  ('ops', 'Operations Analyst',                  18000,  2825),
  ('ops', 'Supply Chain Analyst',                20000,  3108),
  ('ops', 'Vendor Manager',                      22000,  3390),
  ('ops', 'Project Manager',                     25000,  4238),
  ('ops', 'Process Improvement Manager',         25000,  3814),
  ('ops', 'Operations Manager',                  27000,  4379),
  ('ops', 'Operations Director',                 35000,  6357)
) as r(vertical, role_label, base, growth)
cross join generate_series(0, 20) as yrs(years_exp)
cross join generate_series(1, 3) as n(n);
