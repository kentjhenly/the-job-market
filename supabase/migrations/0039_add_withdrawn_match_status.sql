-- Add 'withdrawn' to match_status enum.
-- Candidate withdraws from an accepted match before a hire offer is accepted,
-- closing the chat. Distinct from 'declined' (rejecting the initial pitch).
alter type match_status add value if not exists 'withdrawn';
