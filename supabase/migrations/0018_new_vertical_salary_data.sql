-- ============================================================
-- 0018_new_vertical_salary_data.sql
-- Seed per-role salary curves for the 8 new white-collar
-- verticals (55 roles), same real-benchmark calibration model
-- as 0016: monthly_salary(yrs) = base + growth * yrs^0.85,
-- ±10% noise; growth = (senior10yr - base) / 10^0.85.
-- Existing seed rows (original 5 verticals) are untouched.
--
-- Benchmark anchors (monthly HKD, 2025-26 guides):
--  [MM]   Morgan McKinley HK: Paralegal avg ~45K
--  [JDB]  JobsDB: Legal Counsel 65-75K avg; Teacher avg ~38K
--         (public 25-70K, intl 30-80K)
--  [PSL]  Persol/Larson Maddox legal: analyst (0-3y) 550-700K/yr,
--         associate (3-7y) 700-850K/yr
--  [PS]   PayScale: RN ~420K/yr avg (median ~328K/yr);
--         Quantity Surveyor ~357K/yr (manager QS ~792K/yr);
--         Management Consultant ~444K/yr
--  [ERI]  ERI: Pharmacist 514-953K/yr
--  [IND]  Indeed HK: HR Business Partner ~35.7K/mo;
--         Business Development Manager ~30.1K/mo
--  [C&SD] 2025 AEHS all-occupation median wage 21.2K
-- ============================================================

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
  ('legal', 'Paralegal',                          22000,  4661),
  ('legal', 'Legal Executive',                    20000,  3107),
  ('legal', 'Legal Counsel',                      46000,  6215),
  ('legal', 'Senior Legal Counsel',               60000,  7769),
  ('legal', 'Company Secretarial Officer',        22000,  3672),
  ('legal', 'Compliance Counsel',                 42000,  6074),
  ('legal', 'Head of Legal',                      80000,  9888),

  ('healthcare', 'Registered Nurse',              28000,  3107),
  ('healthcare', 'Enrolled Nurse',                21000,  2119),
  ('healthcare', 'Pharmacist',                    42000,  4238),
  ('healthcare', 'Physiotherapist',               32000,  3672),
  ('healthcare', 'Clinical Research Associate',   25000,  3531),
  ('healthcare', 'Medical Affairs Manager',       48000,  5650),
  ('healthcare', 'Healthcare Administrator',      24000,  3955),

  ('education', 'Teaching Assistant',             14000,  1412),
  ('education', 'Teacher',                        30000,  4520),
  ('education', 'Senior Teacher',                 42000,  4661),
  ('education', 'Curriculum Developer',           28000,  3390),
  ('education', 'Admissions Officer',             19000,  2401),
  ('education', 'Academic Director',              55000,  5650),

  ('sales', 'Sales Executive',                    15000,  2119),
  ('sales', 'Account Executive',                  17000,  2401),
  ('sales', 'Business Development Manager',       22000,  3672),
  ('sales', 'Key Account Manager',                28000,  3955),
  ('sales', 'Customer Success Manager',           26000,  3672),
  ('sales', 'Pre-Sales Consultant',               32000,  4661),
  ('sales', 'Sales Manager',                      35000,  4944),
  ('sales', 'Sales Director',                     55000,  8475),

  ('hr', 'HR Officer',                            17000,  2119),
  ('hr', 'Talent Acquisition Specialist',         20000,  3107),
  ('hr', 'HR Generalist',                         20000,  2825),
  ('hr', 'Compensation & Benefits Specialist',    26000,  3672),
  ('hr', 'Learning & Development Manager',        35000,  3814),
  ('hr', 'HR Business Partner',                   27000,  3955),
  ('hr', 'HR Manager',                            35000,  4661),
  ('hr', 'HR Director',                           65000,  7769),

  ('consulting', 'Business Analyst',              26000,  3672),
  ('consulting', 'Associate Consultant',          30000,  3955),
  ('consulting', 'Management Consultant',         35000,  5650),
  ('consulting', 'Senior Consultant',             48000,  5933),
  ('consulting', 'Engagement Manager',            70000,  7063),
  ('consulting', 'Principal Consultant',          85000,  8475),

  ('property', 'Leasing Officer',                 17000,  2119),
  ('property', 'Property Officer',                16000,  1977),
  ('property', 'Quantity Surveyor',               22000,  4661),
  ('property', 'Building Surveyor',               24000,  4379),
  ('property', 'Facilities Manager',              30000,  3955),
  ('property', 'Property Manager',                28000,  3955),
  ('property', 'Asset Manager',                   45000,  7063),

  ('media', 'Journalist',                         18000,  2401),
  ('media', 'Editor',                             26000,  3390),
  ('media', 'Video Producer',                     22000,  2825),
  ('media', 'Public Relations Officer',           18000,  2401),
  ('media', 'PR Manager',                         33000,  3814),
  ('media', 'Communications Director',            60000,  7063)
) as r(vertical, role_label, base, growth)
cross join generate_series(0, 20) as yrs(years_exp)
cross join generate_series(1, 3) as n(n);
