-- 0032: Richer employer company profile
--
-- Company details are entered in /employer/settings (PROFILE tab) rather than at
-- sign-up, and shown to candidates in the VERIFY EMPLOYER panel on
-- /candidate/matches so they can confirm a pitch is from a real company.
-- (industry / company_size / website already exist on employers.)

alter table employers
  add column headquarters text,
  add column description text;
