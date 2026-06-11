-- ============================================================
-- 0017_expand_verticals.sql
-- Expand the `vertical` enum beyond the original 5 launch
-- verticals to cover the broader white-collar market.
-- Run separately from any migration that USES the new values
-- (new enum values can't be referenced in the same transaction).
-- ============================================================

alter type vertical add value if not exists 'legal';
alter type vertical add value if not exists 'healthcare';
alter type vertical add value if not exists 'education';
alter type vertical add value if not exists 'sales';
alter type vertical add value if not exists 'hr';
alter type vertical add value if not exists 'consulting';
alter type vertical add value if not exists 'property';
alter type vertical add value if not exists 'media';
