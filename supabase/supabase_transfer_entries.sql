-- Create the transfer_entries table
create table if not exists public.transfer_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  party_id uuid references public.parties on delete cascade not null,
  amount numeric not null,
  final_amount numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.transfer_entries enable row level security;

-- Create policies for the transfer_entries table
create policy "Users can view their own transfer entries" 
on transfer_entries for select 
using ( auth.uid() = user_id );

create policy "Users can insert their own transfer entries" 
on transfer_entries for insert 
with check ( auth.uid() = user_id );

create policy "Users can delete their own transfer entries" 
on transfer_entries for delete 
using ( auth.uid() = user_id );

create policy "Users can update their own transfer entries"
on transfer_entries for update
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );
