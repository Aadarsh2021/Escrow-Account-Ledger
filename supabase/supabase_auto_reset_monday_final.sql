-- SQL Script to automatically reset a party's monday_final status to FALSE (No/Pending)
-- whenever a new transaction is inserted (or an existing one is updated to be unfinalized) for that party.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR.

create or replace function public.reset_party_monday_final_on_new_tns()
returns trigger as $$
begin
  -- If the new transaction is NOT finalized, reset the party's monday_final status to false
  if (new.is_finalized = false or new.is_finalized is null) then
    -- Temporarily drop the lock trigger to allow updating the parties table status
    drop trigger if exists trg_lock_monday_final_party on public.parties;
    
    update public.parties
    set monday_final = false
    where id = new.party_id;
    
    -- Re-create the lock trigger
    create trigger trg_lock_monday_final_party
      before update on public.parties
      for each row execute procedure public.check_party_monday_final_lock();
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger on the transactions table
drop trigger if exists trg_reset_party_monday_final_on_new_tns on public.transactions;
create trigger trg_reset_party_monday_final_on_new_tns
  after insert or update on public.transactions
  for each row execute procedure public.reset_party_monday_final_on_new_tns();
