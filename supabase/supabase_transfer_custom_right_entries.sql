-- Create the transfer_custom_right_entries table
create table if not exists public.transfer_custom_right_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  party_name text not null,
  balance numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.transfer_custom_right_entries enable row level security;

-- Create policies for the transfer_custom_right_entries table
create policy "Users can view their own custom right entries" 
on transfer_custom_right_entries for select 
using ( auth.uid() = user_id );

create policy "Users can insert their own custom right entries" 
on transfer_custom_right_entries for insert 
with check ( auth.uid() = user_id );

create policy "Users can delete their own custom right entries" 
on transfer_custom_right_entries for delete 
using ( auth.uid() = user_id );

create policy "Users can update their own custom right entries"
on transfer_custom_right_entries for update
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );
