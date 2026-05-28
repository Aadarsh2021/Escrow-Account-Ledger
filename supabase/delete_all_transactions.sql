-- ============================================================
-- ADMIN COMMAND: Delete ALL transactions for ALL users
-- Reset all parties' settlement flags (monday_final = false)
-- ============================================================

BEGIN;

-- 1. Set session to replica to bypass all user-defined constraint triggers
SET session_replication_role = 'replica';

-- 2. Delete all records from the transactions table
DELETE FROM public.transactions;

-- 3. Reset monday_final status on all parties to false
UPDATE public.parties 
SET monday_final = false;

-- 4. Restore session replication role back to origin (default)
SET session_replication_role = 'origin';

COMMIT;

-- Verify that the transactions table is now completely empty
SELECT COUNT(*) AS total_remaining_transactions FROM public.transactions;
