-- =========================================================================
-- SQL script: Fix check_transaction_lock trigger to allow updating
-- active records and safely updating the is_checked column on all records.
-- Run this in your Supabase SQL Editor.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.check_transaction_lock()
RETURNS TRIGGER AS $$
BEGIN
  -- If local session bypass is active, let it pass
  IF current_setting('app.bypass_monday_final_lock', true) = 'true' THEN
    IF (TG_OP = 'DELETE') THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    -- 1. If ONLY the is_checked column is being toggled, allow it unconditionally (even for finalized records)
    IF (OLD.is_checked IS DISTINCT FROM NEW.is_checked AND
        OLD.id = NEW.id AND
        OLD.user_id = NEW.user_id AND
        OLD.party_id = NEW.party_id AND
        OLD.transaction_date = NEW.transaction_date AND
        OLD.remarks = NEW.remarks AND
        OLD.tns_type = NEW.tns_type AND
        OLD.credit = NEW.credit AND
        OLD.debit = NEW.debit AND
        OLD.balance = NEW.balance AND
        OLD.is_settlement = NEW.is_settlement AND
        OLD.is_finalized = NEW.is_finalized) THEN
      RETURN NEW;
    END IF;

    -- 2. Prevent updating settlement records
    IF (OLD.is_settlement = true) THEN
      RAISE EXCEPTION 'Monday Final settlement records cannot be modified once created.';
    END IF;

    -- 3. Allow unlocking finalized transactions when settlement is deleted
    IF (OLD.is_finalized = true AND NEW.is_finalized = false) THEN
      RETURN NEW;
    END IF;
    
    -- 4. Prevent editing finalized records
    IF (OLD.is_finalized = true) THEN
      RAISE EXCEPTION 'Cannot modify a finalized transaction.';
    END IF;

    -- For normal updates on active records, return NEW to persist changes
    RETURN NEW;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    IF (OLD.is_settlement = true) THEN
      RAISE EXCEPTION 'Monday Final settlement records cannot be deleted once created.';
    END IF;

    IF (OLD.is_finalized = true) THEN
      RAISE EXCEPTION 'Cannot delete a finalized transaction.';
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
