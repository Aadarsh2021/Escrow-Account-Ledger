-- ============================================================
-- SQL migration: Add is_checked column to transactions table
-- ============================================================

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS is_checked BOOLEAN NOT NULL DEFAULT false;
