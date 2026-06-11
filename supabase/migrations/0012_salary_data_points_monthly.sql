-- ============================================================
-- 0012_salary_data_points_monthly.sql
-- Hong Kong salaries are conventionally quoted MONTHLY, not
-- annually. Rename annual_salary -> monthly_salary and rescale
-- existing rows (including the 0010 seed data) by /12 so values
-- represent monthly compensation in cents.
-- ============================================================

alter table salary_data_points rename column annual_salary to monthly_salary;

update salary_data_points
set monthly_salary = round(monthly_salary / 12.0)::integer;
