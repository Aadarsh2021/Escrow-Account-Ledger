-- Create the transactions table
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  party_id uuid references public.parties on delete cascade not null,
  transaction_date timestamp with time zone default timezone('utc'::text, now()),
  remarks text not null,
  tns_type text not null check (tns_type in ('CR', 'DR')),
  credit numeric not null default 0,
  debit numeric not null default 0,
  balance numeric not null default 0, -- Snapshot of balance after this transaction
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.transactions enable row level security;

-- Create policies for the transactions table
create policy "Users can view their own transactions" 
on transactions for select 
using ( auth.uid() = user_id );

create policy "Users can insert their own transactions" 
on transactions for insert 
with check ( auth.uid() = user_id );

create policy "Users can update their own transactions" 
on transactions for update 
using ( auth.uid() = user_id );

create policy "Users can delete their own transactions" 
on transactions for delete 
using ( auth.uid() = user_id );
