-- Per-side "last viewed" timestamps for unread indicators on /candidate/matches
-- and /employer/matches. Employers default to "read" since they create the
-- match by sending the pitch; candidates start unread (NULL) until they open it.
alter table matches
  add column candidate_last_read_at timestamptz,
  add column employer_last_read_at timestamptz not null default now();

-- File attachments for chat messages
alter table match_messages
  add column file_path text,
  add column file_name text,
  add column file_size integer;

alter table match_messages drop constraint if exists match_messages_message_type_check;
alter table match_messages add constraint match_messages_message_type_check
  check (message_type in ('text', 'offer', 'offer_accepted', 'offer_declined', 'file'));

-- Storage bucket for chat file attachments (private, signed-URL access only — mirrors portfolio-files)
insert into storage.buckets (id, name, public, file_size_limit)
values ('match-files', 'match-files', false, 10485760)
on conflict (id) do nothing;
