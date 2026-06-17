-- 0028: Employer feedback on portfolio accuracy
--
-- After a match reaches "accepted", the employer can rate (1-5) whether the
-- candidate's portfolio accurately reflected their ability. One rating per
-- match, only the match's employer may submit it. recommendation-scorer
-- aggregates these ratings per candidate as the portfolio_feedback signal.

create table portfolio_feedback (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references matches(id) on delete cascade,
  employer_id  text not null references employers(id) on delete cascade,
  candidate_id text not null references candidates(id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  created_at   timestamptz not null default now(),
  unique (match_id)
);

create index portfolio_feedback_candidate_idx on portfolio_feedback (candidate_id);

alter table portfolio_feedback enable row level security;

create policy "portfolio_feedback_insert_employer" on portfolio_feedback
  for insert with check (
    employer_id = auth.uid()::text
    and exists (
      select 1 from matches m
      where m.id = portfolio_feedback.match_id
      and m.employer_id = auth.uid()::text
      and m.candidate_id = portfolio_feedback.candidate_id
      and m.status = 'accepted'
    )
  );

create policy "portfolio_feedback_select_employer" on portfolio_feedback
  for select using (employer_id = auth.uid()::text);

create policy "portfolio_feedback_select_candidate" on portfolio_feedback
  for select using (candidate_id = auth.uid()::text);
