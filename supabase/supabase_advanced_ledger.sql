-- Add system_type to parties to distinguish special accounts
alter table public.parties add column if not exists system_type text check (system_type in ('commission', 'company', 'normal')) default 'normal';

-- Update the handle_new_user function to create automatic parties
create or replace function public.handle_new_user() 
returns trigger as $$
declare
  company_name_val text;
begin
  -- Skip profile/party creation for the admin user
  if new.email = 'escrow.bms@gmail.com' then
    return new;
  end if;

  -- Get company name from metadata or use default
  company_name_val := coalesce(new.raw_user_meta_data->>'company_name', 'My Company');

  -- Create the profile
  insert into public.profiles (id, full_name, company_name, company_email)
  values (new.id, new.raw_user_meta_data->>'full_name', company_name_val, new.email);

  -- Create automatic "Commission" party
  insert into public.parties (user_id, sr_no, party_name, status, commission_type, commission_rate, system_type)
  values (new.id, 'SYS-01', 'Commission', 'give', 'without', 0, 'commission');

  -- Create automatic "Company" party
  insert into public.parties (user_id, sr_no, party_name, status, commission_type, commission_rate, system_type)
  values (new.id, 'SYS-02', company_name_val, 'give', 'without', 0, 'company');

  return new;
end;
$$ language plpgsql security definer;

-- Trigger to sync company name changes to the "company" party
create or replace function public.sync_company_name()
returns trigger as $$
begin
  update public.parties
  set party_name = new.company_name
  where user_id = new.id and system_type = 'company';
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_update_sync_company on public.profiles;
create trigger on_profile_update_sync_company
  after update of company_name on public.profiles
  for each row execute procedure public.sync_company_name();

-- Updated Transactions table to support linking and real-time
create table if not exists public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  party_id uuid references public.parties on delete cascade not null,
  linked_transaction_id uuid references public.transactions(id), -- To link entries together
  transaction_date timestamp with time zone default timezone('utc'::text, now()),
  remarks text not null,
  tns_type text not null check (tns_type in ('CR', 'DR')),
  credit numeric not null default 0,
  debit numeric not null default 0,
  balance numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS and Realtime
alter table public.transactions enable row level security;

-- Safe check to add tables to publication without duplication errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'parties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
  END IF;
END $$;
