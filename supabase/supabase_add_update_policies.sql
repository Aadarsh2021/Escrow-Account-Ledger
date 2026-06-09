-- ================================================================
-- FIX: Add missing UPDATE RLS policies for transfer tables
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. Allow users to update their own transfer_entries (left table)
create policy "Users can update their own transfer entries"
on transfer_entries for update
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );

-- 2. Allow users to update their own transfer_custom_right_entries (right table)
create policy "Users can update their own custom right entries"
on transfer_custom_right_entries for update
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id );
