-- ============================================================
-- ADMIN CLEANUP: Delete all transactions for Ankit Kumar (AQC)
-- User ID: 9a5e92ee-c6b1-49de-9126-f86488da58ac
-- APPROACH: 2-phase delete (children first, then anchors)
-- ============================================================

BEGIN;

-- Step 1: Make transaction lock trigger a no-op
CREATE OR REPLACE FUNCTION public.check_transaction_lock()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN RETURN old; END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Make party lock trigger a no-op
CREATE OR REPLACE FUNCTION public.check_party_monday_final_lock()
RETURNS trigger AS $$
BEGIN
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Delete CHILDREN first (rows where linked_transaction_id points to another row)
-- These are the dependent rows - delete them before parents to avoid FK violation
DELETE FROM public.transactions
WHERE user_id = '9a5e92ee-c6b1-49de-9126-f86488da58ac'
  AND linked_transaction_id IS NOT NULL
  AND linked_transaction_id != id;

-- Step 4: Delete remaining rows (anchors: linked_transaction_id = id, or NULL)
DELETE FROM public.transactions
WHERE user_id = '9a5e92ee-c6b1-49de-9126-f86488da58ac';

-- Step 5: Reset monday_final on all parties
UPDATE public.parties
SET monday_final = false
WHERE user_id = '9a5e92ee-c6b1-49de-9126-f86488da58ac';

-- Step 6: Restore original transaction lock trigger
CREATE OR REPLACE FUNCTION public.check_transaction_lock()
RETURNS trigger AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (old.is_settlement = true) THEN
      RAISE EXCEPTION 'Monday Final settlement records cannot be modified once created.';
    END IF;
    IF (old.is_finalized = true AND new.is_finalized = false) THEN RETURN new; END IF;
    IF (old.is_finalized = true) THEN
      RAISE EXCEPTION 'Cannot modify a finalized transaction.';
    END IF;
  END IF;
  IF (TG_OP = 'DELETE') THEN
    IF (old.is_settlement = true) THEN
      RAISE EXCEPTION 'Monday Final settlement records cannot be deleted once created.';
    END IF;
    IF (old.is_finalized = true) THEN
      RAISE EXCEPTION 'Cannot delete a finalized transaction.';
    END IF;
    RETURN old;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Restore original party lock trigger
CREATE OR REPLACE FUNCTION public.check_party_monday_final_lock()
RETURNS trigger AS $$
BEGIN
  IF (old.monday_final = true AND new.monday_final = false) THEN
    RAISE EXCEPTION 'Monday Final status cannot be changed back to Pending once finalized.';
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Verify
SELECT COUNT(*) AS remaining_transactions
FROM public.transactions
WHERE user_id = '9a5e92ee-c6b1-49de-9126-f86488da58ac';

COMMIT;


