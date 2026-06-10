-- ============================================================
-- 0004_salary_seed.sql
-- Seed salary data: Hong Kong tech vertical
-- Based on public market data ranges (2024)
-- Annual salary stored in cents (HKD)
-- ============================================================

-- Helper: generate realistic salary variation
-- Junior (0-2 yrs): HKD 48K–72K
-- Mid (3-5 yrs): HKD 72K–110K
-- Senior (6-9 yrs): HKD 110K–160K
-- Lead/Principal (10+ yrs): HKD 150K–220K

insert into salary_data_points (vertical, years_exp, location, remote, annual_salary, source) values
-- 0 years
('tech', 0, 'Hong Kong', false, 4800000, 'seed'),
('tech', 0, 'Hong Kong', false, 5200000, 'seed'),
('tech', 0, 'Hong Kong', false, 5500000, 'seed'),
('tech', 0, 'Hong Kong', false, 4900000, 'seed'),
('tech', 0, 'Hong Kong', true,  5000000, 'seed'),
('tech', 0, 'Hong Kong', true,  5300000, 'seed'),

-- 1 year
('tech', 1, 'Hong Kong', false, 5500000, 'seed'),
('tech', 1, 'Hong Kong', false, 6000000, 'seed'),
('tech', 1, 'Hong Kong', false, 6200000, 'seed'),
('tech', 1, 'Hong Kong', false, 5800000, 'seed'),
('tech', 1, 'Hong Kong', true,  5700000, 'seed'),
('tech', 1, 'Hong Kong', true,  6100000, 'seed'),

-- 2 years
('tech', 2, 'Hong Kong', false, 6500000, 'seed'),
('tech', 2, 'Hong Kong', false, 7000000, 'seed'),
('tech', 2, 'Hong Kong', false, 7200000, 'seed'),
('tech', 2, 'Hong Kong', false, 6800000, 'seed'),
('tech', 2, 'Hong Kong', true,  6700000, 'seed'),
('tech', 2, 'Hong Kong', true,  7100000, 'seed'),
('tech', 2, 'Hong Kong', false, 6900000, 'seed'),

-- 3 years
('tech', 3, 'Hong Kong', false, 7500000, 'seed'),
('tech', 3, 'Hong Kong', false, 8000000, 'seed'),
('tech', 3, 'Hong Kong', false, 8500000, 'seed'),
('tech', 3, 'Hong Kong', false, 7800000, 'seed'),
('tech', 3, 'Hong Kong', true,  8200000, 'seed'),
('tech', 3, 'Hong Kong', true,  8700000, 'seed'),
('tech', 3, 'Hong Kong', false, 7600000, 'seed'),
('tech', 3, 'Hong Kong', false, 8300000, 'seed'),

-- 4 years
('tech', 4, 'Hong Kong', false, 8500000, 'seed'),
('tech', 4, 'Hong Kong', false, 9000000, 'seed'),
('tech', 4, 'Hong Kong', false, 9500000, 'seed'),
('tech', 4, 'Hong Kong', false, 8800000, 'seed'),
('tech', 4, 'Hong Kong', true,  9200000, 'seed'),
('tech', 4, 'Hong Kong', true,  9800000, 'seed'),
('tech', 4, 'Hong Kong', false, 8700000, 'seed'),
('tech', 4, 'Hong Kong', false, 9100000, 'seed'),

-- 5 years
('tech', 5, 'Hong Kong', false, 9500000, 'seed'),
('tech', 5, 'Hong Kong', false, 10000000, 'seed'),
('tech', 5, 'Hong Kong', false, 10500000, 'seed'),
('tech', 5, 'Hong Kong', false, 9800000, 'seed'),
('tech', 5, 'Hong Kong', true,  10200000, 'seed'),
('tech', 5, 'Hong Kong', true,  10800000, 'seed'),
('tech', 5, 'Hong Kong', false, 9600000, 'seed'),
('tech', 5, 'Hong Kong', false, 10100000, 'seed'),
('tech', 5, 'Hong Kong', false, 10400000, 'seed'),

-- 6 years
('tech', 6, 'Hong Kong', false, 11000000, 'seed'),
('tech', 6, 'Hong Kong', false, 11500000, 'seed'),
('tech', 6, 'Hong Kong', false, 12000000, 'seed'),
('tech', 6, 'Hong Kong', false, 11200000, 'seed'),
('tech', 6, 'Hong Kong', true,  11800000, 'seed'),
('tech', 6, 'Hong Kong', true,  12500000, 'seed'),
('tech', 6, 'Hong Kong', false, 11300000, 'seed'),
('tech', 6, 'Hong Kong', false, 11700000, 'seed'),

-- 7 years
('tech', 7, 'Hong Kong', false, 12000000, 'seed'),
('tech', 7, 'Hong Kong', false, 12500000, 'seed'),
('tech', 7, 'Hong Kong', false, 13000000, 'seed'),
('tech', 7, 'Hong Kong', false, 12200000, 'seed'),
('tech', 7, 'Hong Kong', true,  12800000, 'seed'),
('tech', 7, 'Hong Kong', true,  13500000, 'seed'),
('tech', 7, 'Hong Kong', false, 12300000, 'seed'),
('tech', 7, 'Hong Kong', false, 12700000, 'seed'),
('tech', 7, 'Hong Kong', false, 13200000, 'seed'),

-- 8 years
('tech', 8, 'Hong Kong', false, 13000000, 'seed'),
('tech', 8, 'Hong Kong', false, 13500000, 'seed'),
('tech', 8, 'Hong Kong', false, 14000000, 'seed'),
('tech', 8, 'Hong Kong', false, 13200000, 'seed'),
('tech', 8, 'Hong Kong', true,  13800000, 'seed'),
('tech', 8, 'Hong Kong', true,  14500000, 'seed'),
('tech', 8, 'Hong Kong', false, 13400000, 'seed'),

-- 9 years
('tech', 9, 'Hong Kong', false, 14000000, 'seed'),
('tech', 9, 'Hong Kong', false, 14500000, 'seed'),
('tech', 9, 'Hong Kong', false, 15000000, 'seed'),
('tech', 9, 'Hong Kong', false, 14200000, 'seed'),
('tech', 9, 'Hong Kong', true,  14800000, 'seed'),
('tech', 9, 'Hong Kong', true,  15500000, 'seed'),
('tech', 9, 'Hong Kong', false, 14300000, 'seed'),
('tech', 9, 'Hong Kong', false, 14700000, 'seed'),

-- 10 years
('tech', 10, 'Hong Kong', false, 15000000, 'seed'),
('tech', 10, 'Hong Kong', false, 16000000, 'seed'),
('tech', 10, 'Hong Kong', false, 17000000, 'seed'),
('tech', 10, 'Hong Kong', false, 15500000, 'seed'),
('tech', 10, 'Hong Kong', true,  16500000, 'seed'),
('tech', 10, 'Hong Kong', true,  17500000, 'seed'),
('tech', 10, 'Hong Kong', false, 15800000, 'seed'),
('tech', 10, 'Hong Kong', false, 16200000, 'seed'),

-- 12 years
('tech', 12, 'Hong Kong', false, 17000000, 'seed'),
('tech', 12, 'Hong Kong', false, 18000000, 'seed'),
('tech', 12, 'Hong Kong', false, 19000000, 'seed'),
('tech', 12, 'Hong Kong', true,  18500000, 'seed'),
('tech', 12, 'Hong Kong', false, 17500000, 'seed'),
('tech', 12, 'Hong Kong', false, 18200000, 'seed'),

-- 15 years
('tech', 15, 'Hong Kong', false, 19000000, 'seed'),
('tech', 15, 'Hong Kong', false, 20000000, 'seed'),
('tech', 15, 'Hong Kong', false, 22000000, 'seed'),
('tech', 15, 'Hong Kong', true,  21000000, 'seed'),
('tech', 15, 'Hong Kong', false, 19500000, 'seed'),

-- 18 years
('tech', 18, 'Hong Kong', false, 21000000, 'seed'),
('tech', 18, 'Hong Kong', false, 22000000, 'seed'),
('tech', 18, 'Hong Kong', false, 24000000, 'seed'),
('tech', 18, 'Hong Kong', true,  22500000, 'seed'),

-- 20 years
('tech', 20, 'Hong Kong', false, 22000000, 'seed'),
('tech', 20, 'Hong Kong', false, 24000000, 'seed'),
('tech', 20, 'Hong Kong', false, 26000000, 'seed'),
('tech', 20, 'Hong Kong', true,  25000000, 'seed');
