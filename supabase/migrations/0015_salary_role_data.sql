-- ============================================================
-- 0015_salary_role_data.sql
-- Add per-role salary data so the job posting MARKET DATA
-- regression can be filtered by job title, not just vertical.
-- Same curve shape as 0010 (concave growth + noise), with
-- per-role base/growth figures layered on top of each
-- vertical's baseline. Values are monthly HKD cents, matching
-- the 0012 rescale.
-- ============================================================

alter table salary_data_points add column if not exists role_label text;

delete from salary_data_points where source = 'seed';

insert into salary_data_points (vertical, role_label, years_exp, location, remote, monthly_salary, source)
select
  r.vertical::vertical,
  r.role_label,
  yrs.years_exp,
  'Hong Kong',
  random() < 0.3,
  round((r.base + r.growth * power(yrs.years_exp, 0.85)) * (0.85 + random() * 0.30) * 100 / 12)::integer,
  'seed'
from (values
  ('tech', 'Fullstack Engineer',                204000,  79200),
  ('tech', 'Backend Engineer',                  228000,  94050),
  ('tech', 'Mobile Engineer',                   228000,  99000),
  ('tech', 'Senior Frontend Engineer',          252000, 103950),
  ('tech', 'Data Engineer',                     252000, 108900),
  ('tech', 'ML Engineer',                       288000, 128700),
  ('tech', 'Platform Engineer',                 276000, 123750),
  ('tech', 'Site Reliability Engineer',         276000, 123750),
  ('tech', 'Security Engineer',                 300000, 128700),
  ('tech', 'Staff Engineer',                    324000, 153450),

  ('finance', 'Accountant',                     225000, 119600),
  ('finance', 'Financial Analyst',              255000, 147200),
  ('finance', 'Compliance Officer',             270000, 156400),
  ('finance', 'Risk Analyst',                   285000, 174800),
  ('finance', 'Equity Research Analyst',        315000, 211600),
  ('finance', 'Investment Banking Analyst',     360000, 257600),
  ('finance', 'Financial Controller',           375000, 248400),
  ('finance', 'Portfolio Manager',              420000, 303600),

  ('marketing', 'Social Media Manager',         182400,  63000),
  ('marketing', 'SEO Specialist',               193800,  67500),
  ('marketing', 'Content Marketing Manager',    216600,  81000),
  ('marketing', 'Marketing Analyst',            216600,  85500),
  ('marketing', 'Performance Marketing Manager',239400,  99000),
  ('marketing', 'Brand Manager',                250800, 103500),
  ('marketing', 'Growth Marketing Lead',        273600, 117000),
  ('marketing', 'Marketing Director',           319200, 144000),

  ('design', 'Visual Designer',                 196800,  64400),
  ('design', 'UI Designer',                     221400,  78200),
  ('design', 'UX Designer',                     233700,  87400),
  ('design', 'Product Designer',                258300, 101200),
  ('design', 'UX Researcher',                   258300, 101200),
  ('design', 'Brand Designer',                  221400,  78200),
  ('design', 'Design Systems Lead',             295200, 119600),
  ('design', 'Design Director',                 344400, 147200),

  ('ops', 'Logistics Coordinator',              172800,  58800),
  ('ops', 'Operations Analyst',                 183600,  67200),
  ('ops', 'Supply Chain Analyst',               205200,  79800),
  ('ops', 'Vendor Manager',                     216000,  84000),
  ('ops', 'Project Manager',                    226800,  92400),
  ('ops', 'Process Improvement Manager',        237600,  96600),
  ('ops', 'Operations Manager',                 259200, 109200),
  ('ops', 'Operations Director',                302400, 134400)
) as r(vertical, role_label, base, growth)
cross join generate_series(0, 20) as yrs(years_exp)
cross join generate_series(1, 3) as n(n);
