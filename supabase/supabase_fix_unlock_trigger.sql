-- FIX: Allow unlocking finalized transactions when settlement is deleted
-- Run this in your Supabase SQL Editor

create or replace function public.check_transaction_lock()
returns trigger as $$
begin
  if (TG_OP = 'UPDATE') then
    -- Allow the update if the system is intentionally un-finalizing the record (during settlement deletion)
    if (old.is_finalized = true and new.is_finalized = false) then
      return new;
    end if;
    
    if (old.is_finalized = true) then
      raise exception 'Cannot modify a finalized transaction. Delete the Monday Final settlement first to unlock these records.';
    end if;
  end if;

  if (TG_OP = 'DELETE') then
    if (old.is_finalized = true) then
      raise exception 'Cannot delete a finalized transaction. Delete the Monday Final settlement first to unlock these records.';
    end if;
    return old;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;
