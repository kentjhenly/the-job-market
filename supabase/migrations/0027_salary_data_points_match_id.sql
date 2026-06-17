-- 0027: Per-match dedup for salary_data_points
--
-- POST /api/matches/[matchId]/respond inserts a salary_data_points row
-- (source: 'match') when a pitch is accepted. match_id links that row back
-- to the match it came from; the partial unique index ensures a retry or
-- race on accept can't insert a second row for the same match.

alter table salary_data_points add column match_id uuid references matches(id);

create unique index salary_data_points_match_id_uidx
  on salary_data_points (match_id)
  where match_id is not null;
