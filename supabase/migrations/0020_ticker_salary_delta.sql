-- ============================================================
-- 0020_ticker_salary_delta.sql
-- Ticker events carry the accepted monthly salary (cents) and
-- its % delta vs the regression median for that role/experience,
-- so the tape can show "ROLE · HKD 52K · ▲ +7.5%" anonymously.
-- salary_band is kept for older rows.
-- ============================================================

alter table match_ticker_events add column if not exists salary integer;
alter table match_ticker_events add column if not exists delta_pct real;
