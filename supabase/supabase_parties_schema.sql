-- Create the parties table
create table public.parties (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null default auth.uid(),
  sr_no text not null,
  name text not null,
  status text not null check (status in ('take', 'give')),
  commission_type text not null check (commission_type in ('with', 'without')),
  commission_rate numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.parties enable row level security;

-- Create policies for the parties table
create policy "Users can view their own parties" 
on parties for select 
using ( auth.uid() = user_id );

create policy "Users can insert their own parties" 
on parties for insert 
with check ( auth.uid() = user_id );

create policy "Users can update their own parties" 
on parties for update 
using ( auth.uid() = user_id );

create policy "Users can delete their own parties" 
on parties for delete 
using ( auth.uid() = user_id );
