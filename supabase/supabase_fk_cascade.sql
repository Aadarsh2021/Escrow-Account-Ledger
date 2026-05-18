-- Alter foreign key constraint to ON DELETE CASCADE
-- This ensures that if an anchor transaction is deleted, the linked partner entry is also deleted automatically, preventing constraint violations.

alter table public.transactions
  drop constraint if exists transactions_linked_transaction_id_fkey;

alter table public.transactions
  add constraint transactions_linked_transaction_id_fkey 
  foreign key (linked_transaction_id) 
  references public.transactions(id) 
  on delete cascade;
