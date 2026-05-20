
-- Update transactions table to support Monday Final logic
alter table public.transactions add column if not exists is_finalized boolean default false;
alter table public.transactions add column if not exists is_settlement boolean default false;
alter table public.transactions add column if not exists settlement_id uuid references public.transactions(id);

-- Create a policy or trigger to prevent modification of finalized records
create or replace function public.check_transaction_lock()
returns trigger as $$
begin
  if (old.is_finalized = true) then
    raise exception 'Cannot modify or delete a finalized transaction. Delete the Monday Final settlement first to unlock these records.';
  end if;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_lock_finalized_transactions on public.transactions;
create trigger trg_lock_finalized_transactions
  before update or delete on public.transactions
  for each row execute procedure public.check_transaction_lock();

-- Restoration Trigger: Settlement delete karne par purane records wapas lane ke liye
create or replace function public.handle_settlement_deletion()
returns trigger as $$
begin
  if (old.is_settlement = true) then
    -- Enable transaction-local lock bypass
    perform set_config('app.bypass_monday_final_lock', 'true', true);

    -- 1. Unlock all transactions that were part of this settlement
    update public.transactions
    set is_finalized = false, settlement_id = null
    where settlement_id = old.id;

    -- 2. Reset party monday_final status to false
    update public.parties
    set monday_final = false
    where id = old.party_id;
  end if;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_handle_settlement_deletion on public.transactions;
create trigger trg_handle_settlement_deletion
  before delete on public.transactions
  for each row execute procedure public.handle_settlement_deletion();
