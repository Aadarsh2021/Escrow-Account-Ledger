-- Create the transfer_sheet_status table
create table if not exists public.transfer_sheet_status (
  user_id uuid primary key references auth.users on delete cascade not null default auth.uid(),
  is_saved boolean not null default false,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.transfer_sheet_status enable row level security;

-- Create policies for the transfer_sheet_status table
create policy "Users can view their own sheet status" 
on transfer_sheet_status for select 
using ( auth.uid() = user_id );

create policy "Users can insert their own sheet status" 
on transfer_sheet_status for insert 
with check ( auth.uid() = user_id );

create policy "Users can update their own sheet status" 
on transfer_sheet_status for update 
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );
