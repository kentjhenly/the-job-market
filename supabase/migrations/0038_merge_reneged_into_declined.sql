-- Merge 'reneged' into 'declined' for both offer_status and message_type.
-- The sender_id on the message distinguishes candidate-decline from
-- employer-withdraw; a separate status value is unnecessary.

update matches set offer_status = 'declined' where offer_status = 'reneged';

alter table matches drop constraint if exists matches_offer_status_check;
alter table matches add constraint matches_offer_status_check
  check (offer_status in ('pending', 'accepted', 'declined'));

update match_messages set message_type = 'offer_declined' where message_type = 'offer_reneged';

alter table match_messages drop constraint if exists match_messages_message_type_check;
alter table match_messages add constraint match_messages_message_type_check
  check (message_type in ('text', 'offer', 'offer_accepted', 'offer_declined', 'file'));
