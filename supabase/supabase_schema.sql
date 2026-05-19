-- Create the profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  company_name text,
  company_email text,
  company_phone text,
  company_address text,
  company_website text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create policies for the profiles table
create policy "Users can view their own profile" 
on profiles for select 
using ( auth.uid() = id );

create policy "Users can insert their own profile" 
on profiles for insert 
with check ( auth.uid() = id );

create policy "Users can update their own profile" 
on profiles for update 
using ( auth.uid() = id );

-- Create a trigger to automatically create a profile for new users
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  -- Skip profile creation for the admin user
  if new.email = 'escrow.bms@gmail.com' then
    return new;
  end if;

  insert into public.profiles (id, full_name, company_email)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
