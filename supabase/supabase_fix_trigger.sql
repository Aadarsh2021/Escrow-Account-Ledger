-- BUG FIX FOR SILENT UPDATE FAILURES
-- Run this in your Supabase SQL Editor

create or replace function public.check_transaction_lock()
returns trigger as $$
begin
  if (TG_OP = 'UPDATE' or TG_OP = 'DELETE') then
    if (old.is_finalized = true) then
      raise exception 'Cannot modify or delete a finalized transaction. Delete the Monday Final settlement first to unlock these records.';
    end if;
  end if;
  
  if (TG_OP = 'DELETE') then
    return old;
  end if;
  
  return new; -- Must return NEW for updates to succeed!
end;
$$ language plpgsql security definer;
