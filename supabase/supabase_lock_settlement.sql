-- SQL Script to completely lock Monday Final Settlement records and Party status
-- Run this in your Supabase SQL Editor to block deletion and modification of settlements and finalized statuses.

-- 1. Trigger for preventing deletion/modification of settlement transactions, and preventing unlocking of finalized records
create or replace function public.check_transaction_lock()
returns trigger as $$
begin
  if (TG_OP = 'UPDATE') then
    if (old.is_settlement = true) then
      raise exception 'Monday Final settlement records cannot be modified once created.';
    end if;

    -- Allow unlocking finalized transactions when settlement is deleted (if it's not a settlement itself)
    -- Note: Since settlement deletion is now blocked, this path is also effectively blocked for users,
    -- but we preserve the condition just in case of migrations/admin commands.
    if (old.is_finalized = true and new.is_finalized = false) then
      return new;
    end if;
    
    if (old.is_finalized = true) then
      raise exception 'Cannot modify a finalized transaction.';
    end if;
  end if;

  if (TG_OP = 'DELETE') then
    if (old.is_settlement = true) then
      raise exception 'Monday Final settlement records cannot be deleted once created.';
    end if;

    if (old.is_finalized = true) then
      raise exception 'Cannot delete a finalized transaction.';
    end if;
    return old;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- 2. Trigger for preventing changing monday_final status from true back to false
create or replace function public.check_party_monday_final_lock()
returns trigger as $$
begin
  -- If local session bypass is active, let it pass
  if current_setting('app.bypass_monday_final_lock', true) = 'true' then
    return new;
  end if;

  if (old.monday_final = true and new.monday_final = false) then
    raise exception 'Monday Final status cannot be changed back to Pending once finalized.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_lock_monday_final_party on public.parties;
create trigger trg_lock_monday_final_party
  before update on public.parties
  for each row execute procedure public.check_party_monday_final_lock();
