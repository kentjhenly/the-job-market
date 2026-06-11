-- ============================================================
-- 0013_ticker_monthly_salary_bands.sql
-- Rescale match_ticker_events salary bands (set to annual HKD
-- figures in 0011) down to monthly figures, matching the
-- salary_data_points monthly conversion in 0012 (/12).
-- ============================================================

update match_ticker_events set salary_band = 'HKD 79K–96K'   where vertical = 'tech' and role_label = 'STAFF ENGINEER'     and salary_band = 'HKD 950K–1150K';
update match_ticker_events set salary_band = 'HKD 52K–63K'   where vertical = 'tech' and role_label = 'SENIOR FRONTEND'    and salary_band = 'HKD 620K–760K';
update match_ticker_events set salary_band = 'HKD 62K–75K'   where vertical = 'tech' and role_label = 'ML ENGINEER'        and salary_band = 'HKD 740K–900K';
update match_ticker_events set salary_band = 'HKD 42K–52K'   where vertical = 'tech' and role_label = 'BACKEND ENGINEER'   and salary_band = 'HKD 500K–620K';
update match_ticker_events set salary_band = 'HKD 60K–73K'   where vertical = 'tech' and role_label = 'PLATFORM ENGINEER'  and salary_band = 'HKD 720K–880K';
update match_ticker_events set salary_band = 'HKD 52K–63K'   where vertical = 'tech' and role_label = 'DATA ENGINEER'      and salary_band = 'HKD 620K–760K';
update match_ticker_events set salary_band = 'HKD 32K–39K'   where vertical = 'tech' and role_label = 'FULLSTACK ENGINEER' and salary_band = 'HKD 380K–470K';
update match_ticker_events set salary_band = 'HKD 47K–58K'   where vertical = 'tech' and role_label = 'MOBILE ENGINEER'    and salary_band = 'HKD 560K–690K';
update match_ticker_events set salary_band = 'HKD 71K–86K'   where vertical = 'tech' and role_label = 'SECURITY ENGINEER'  and salary_band = 'HKD 850K–1030K';
update match_ticker_events set salary_band = 'HKD 62K–75K'   where vertical = 'tech' and role_label = 'SRE'                and salary_band = 'HKD 740K–900K';
update match_ticker_events set salary_band = 'HKD 92K–113K'  where vertical = 'tech' and role_label = 'STAFF ENGINEER'     and salary_band = 'HKD 1100K–1350K';
update match_ticker_events set salary_band = 'HKD 47K–58K'   where vertical = 'tech' and role_label = 'SENIOR FRONTEND'    and salary_band = 'HKD 560K–690K';
update match_ticker_events set salary_band = 'HKD 67K–81K'   where vertical = 'tech' and role_label = 'ML ENGINEER'        and salary_band = 'HKD 800K–970K';
update match_ticker_events set salary_band = 'HKD 37K–46K'   where vertical = 'tech' and role_label = 'BACKEND ENGINEER'   and salary_band = 'HKD 440K–550K';
update match_ticker_events set salary_band = 'HKD 66K–80K'   where vertical = 'tech' and role_label = 'PLATFORM ENGINEER'  and salary_band = 'HKD 790K–960K';
update match_ticker_events set salary_band = 'HKD 47K–58K'   where vertical = 'tech' and role_label = 'DATA ENGINEER'      and salary_band = 'HKD 560K–690K';
update match_ticker_events set salary_band = 'HKD 25K–33K'   where vertical = 'tech' and role_label = 'FULLSTACK ENGINEER' and salary_band = 'HKD 300K–390K';
update match_ticker_events set salary_band = 'HKD 52K–63K'   where vertical = 'tech' and role_label = 'MOBILE ENGINEER'    and salary_band = 'HKD 620K–760K';
