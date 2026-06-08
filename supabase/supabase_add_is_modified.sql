-- ============================================================
-- SQL migration: Add is_modified column to transactions table
-- ============================================================

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS is_modified BOOLEAN NOT NULL DEFAULT false;
