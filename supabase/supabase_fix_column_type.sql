-- SQL Script to convert the monday_final column type from TEXT to BOOLEAN
-- and ensure clean data type handling.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR.

-- 1. Temporarily drop the lock trigger to allow modifying the table
drop trigger if exists trg_lock_monday_final_party on public.parties;

-- 2. Convert monday_final column to boolean type (casting text to boolean using 'USING')
alter table public.parties 
  alter column monday_final type boolean 
  using (
    case 
      when monday_final = 'true' then true 
      when monday_final = 'Yes' then true
      else false 
    end
  );

-- 3. Set the default value of monday_final to FALSE
alter table public.parties alter column monday_final set default false;

-- 4. Re-enable the lock trigger
create trigger trg_lock_monday_final_party
  before update on public.parties
  for each row execute procedure public.check_party_monday_final_lock();
