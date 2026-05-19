-- 1. Clean up existing orphan transactions (where user no longer exists)
DELETE FROM public.transactions
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 2. Clean up existing orphan transactions (where party belongs to a non-existent user)
DELETE FROM public.transactions
WHERE party_id IN (
  SELECT id FROM public.parties
  WHERE user_id NOT IN (SELECT id FROM auth.users)
);

-- 3. Clean up existing orphan parties (where user no longer exists)
DELETE FROM public.parties
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- 4. Alter parties table foreign key to ON DELETE CASCADE
ALTER TABLE public.parties
  DROP CONSTRAINT IF EXISTS parties_user_id_fkey;

ALTER TABLE public.parties
  ADD CONSTRAINT parties_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 5. Alter transactions table foreign key to ON DELETE CASCADE
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 6. Clean up any existing profiles or parties created for the admin user
DELETE FROM public.transactions WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'escrow.bms@gmail.com');
DELETE FROM public.parties WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'escrow.bms@gmail.com');
DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users WHERE email = 'escrow.bms@gmail.com');


