-- ============================================================
-- 0011_realistic_hk_ticker_seed.sql
-- Rescale match_ticker_events salary bands to realistic 2026
-- HKD figures matching the salary_data_points seed in 0010.
-- Same role labels as the 0007 seed; the live rows still carry
-- their original SGD-denominated bands (0007's source file was
-- edited to HKD after being applied, but never re-seeded).
-- ============================================================

update match_ticker_events set salary_band = 'HKD 950K–1150K'  where vertical = 'tech' and role_label = 'STAFF ENGINEER'     and salary_band = 'SGD 150K–180K';
update match_ticker_events set salary_band = 'HKD 620K–760K'   where vertical = 'tech' and role_label = 'SENIOR FRONTEND'    and salary_band = 'SGD 110K–140K';
update match_ticker_events set salary_band = 'HKD 740K–900K'   where vertical = 'tech' and role_label = 'ML ENGINEER'        and salary_band = 'SGD 130K–160K';
update match_ticker_events set salary_band = 'HKD 500K–620K'   where vertical = 'tech' and role_label = 'BACKEND ENGINEER'   and salary_band = 'SGD 100K–130K';
update match_ticker_events set salary_band = 'HKD 720K–880K'   where vertical = 'tech' and role_label = 'PLATFORM ENGINEER'  and salary_band = 'SGD 120K–150K';
update match_ticker_events set salary_band = 'HKD 620K–760K'   where vertical = 'tech' and role_label = 'DATA ENGINEER'      and salary_band = 'SGD 110K–140K';
update match_ticker_events set salary_band = 'HKD 380K–470K'   where vertical = 'tech' and role_label = 'FULLSTACK ENGINEER' and salary_band = 'SGD 90K–120K';
update match_ticker_events set salary_band = 'HKD 560K–690K'   where vertical = 'tech' and role_label = 'MOBILE ENGINEER'    and salary_band = 'SGD 100K–130K';
update match_ticker_events set salary_band = 'HKD 850K–1030K'  where vertical = 'tech' and role_label = 'SECURITY ENGINEER'  and salary_band = 'SGD 140K–170K';
update match_ticker_events set salary_band = 'HKD 740K–900K'   where vertical = 'tech' and role_label = 'SRE'               and salary_band = 'SGD 120K–150K';
update match_ticker_events set salary_band = 'HKD 1100K–1350K' where vertical = 'tech' and role_label = 'STAFF ENGINEER'     and salary_band = 'SGD 160K–190K';
update match_ticker_events set salary_band = 'HKD 560K–690K'   where vertical = 'tech' and role_label = 'SENIOR FRONTEND'    and salary_band = 'SGD 100K–130K';
update match_ticker_events set salary_band = 'HKD 800K–970K'   where vertical = 'tech' and role_label = 'ML ENGINEER'        and salary_band = 'SGD 140K–170K';
update match_ticker_events set salary_band = 'HKD 440K–550K'   where vertical = 'tech' and role_label = 'BACKEND ENGINEER'   and salary_band = 'SGD 90K–120K';
update match_ticker_events set salary_band = 'HKD 790K–960K'   where vertical = 'tech' and role_label = 'PLATFORM ENGINEER'  and salary_band = 'SGD 130K–160K';
update match_ticker_events set salary_band = 'HKD 560K–690K'   where vertical = 'tech' and role_label = 'DATA ENGINEER'      and salary_band = 'SGD 100K–130K';
update match_ticker_events set salary_band = 'HKD 300K–390K'   where vertical = 'tech' and role_label = 'FULLSTACK ENGINEER' and salary_band = 'SGD 80K–110K';
update match_ticker_events set salary_band = 'HKD 620K–760K'   where vertical = 'tech' and role_label = 'MOBILE ENGINEER'    and salary_band = 'SGD 110K–140K';
