-- Alter parties table foreign key to ON DELETE CASCADE
ALTER TABLE public.parties
  DROP CONSTRAINT IF EXISTS parties_user_id_fkey;

ALTER TABLE public.parties
  ADD CONSTRAINT parties_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Alter transactions table foreign key to ON DELETE CASCADE
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
