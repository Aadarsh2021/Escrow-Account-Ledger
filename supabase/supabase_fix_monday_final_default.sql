-- SQL Script to fix the default value of monday_final on the parties table
-- and reset incorrect Yes statuses for parties without finalized transactions.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR.

-- 1. Temporarily drop the lock trigger to allow updating existing records
drop trigger if exists trg_lock_monday_final_party on public.parties;

-- 2. Alter the column default value to FALSE (so new parties start as Pending/No)
alter table public.parties alter column monday_final set default false;

-- 3. Reset monday_final status to false for all parties that have NO finalized transactions
-- Using bulletproof NOT EXISTS to avoid SQL NULL pitfalls
update public.parties p
set monday_final = false 
where not exists (
  select 1 
  from public.transactions t
  where t.party_id = p.id 
    and t.is_finalized = true
);

-- 4. Re-enable the lock trigger to prevent manual reverting of finalized parties
create trigger trg_lock_monday_final_party
  before update on public.parties
  for each row execute procedure public.check_party_monday_final_lock();
