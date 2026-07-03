-- ============================================================
-- SQL migration: Add updated_at column to transactions table
-- ============================================================

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone default timezone('utc'::text, now());
