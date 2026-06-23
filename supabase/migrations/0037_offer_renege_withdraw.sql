-- Distinguish the two negative outcomes of a pending hire offer:
--   reneged  — the CANDIDATE disapproves the offer they were sent
--   declined — the EMPLOYER withdraws their own pending offer
-- Previously the candidate's rejection was stored as 'declined'; that path is
-- now 'reneged', and 'declined' is reserved for an employer withdrawal. Both
-- leave matches.status = 'accepted' so the chat stays open and the employer
-- can send a fresh offer.

alter table matches drop constraint if exists matches_offer_status_check;
alter table matches add constraint matches_offer_status_check
  check (offer_status in ('pending', 'accepted', 'declined', 'reneged'));

-- Chat system-card for a candidate reneging on an offer (mirrors offer_declined,
-- which now denotes an employer withdrawal).
alter table match_messages drop constraint if exists match_messages_message_type_check;
alter table match_messages add constraint match_messages_message_type_check
  check (message_type in ('text', 'offer', 'offer_accepted', 'offer_declined', 'offer_reneged', 'file'));
