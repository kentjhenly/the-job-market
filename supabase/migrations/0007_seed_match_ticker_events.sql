-- ============================================================
-- 0007_seed_match_ticker_events.sql
-- Seed anonymised match ticker events so the live ticker tape
-- (TopBar marquee + /ticker page) is never empty in fresh envs.
-- Mirrors the mockup's window.MM.tickerSeed roles/bands.
-- ============================================================

insert into match_ticker_events (vertical, role_label, salary_band, match_type, created_at) values
('tech', 'STAFF ENGINEER',     'SGD 150K–180K', 'match', now() - interval '2 minutes'),
('tech', 'SENIOR FRONTEND',    'SGD 110K–140K', 'match', now() - interval '6 minutes'),
('tech', 'ML ENGINEER',        'SGD 130K–160K', 'match', now() - interval '11 minutes'),
('tech', 'BACKEND ENGINEER',   'SGD 100K–130K', 'match', now() - interval '17 minutes'),
('tech', 'PLATFORM ENGINEER',  'SGD 120K–150K', 'match', now() - interval '24 minutes'),
('tech', 'DATA ENGINEER',      'SGD 110K–140K', 'match', now() - interval '32 minutes'),
('tech', 'FULLSTACK ENGINEER', 'SGD 90K–120K',  'match', now() - interval '41 minutes'),
('tech', 'MOBILE ENGINEER',    'SGD 100K–130K', 'match', now() - interval '52 minutes'),
('tech', 'SECURITY ENGINEER',  'SGD 140K–170K', 'match', now() - interval '64 minutes'),
('tech', 'SRE',                'SGD 120K–150K', 'match', now() - interval '78 minutes'),
('tech', 'STAFF ENGINEER',     'SGD 160K–190K', 'match', now() - interval '93 minutes'),
('tech', 'SENIOR FRONTEND',    'SGD 100K–130K', 'match', now() - interval '110 minutes'),
('tech', 'ML ENGINEER',        'SGD 140K–170K', 'match', now() - interval '128 minutes'),
('tech', 'BACKEND ENGINEER',   'SGD 90K–120K',  'match', now() - interval '148 minutes'),
('tech', 'PLATFORM ENGINEER',  'SGD 130K–160K', 'match', now() - interval '170 minutes'),
('tech', 'DATA ENGINEER',      'SGD 100K–130K', 'match', now() - interval '194 minutes'),
('tech', 'FULLSTACK ENGINEER', 'SGD 80K–110K',  'match', now() - interval '220 minutes'),
('tech', 'MOBILE ENGINEER',    'SGD 110K–140K', 'match', now() - interval '248 minutes');
