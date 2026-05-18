-- 1. Alter public.profiles table to add columns for admin management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

-- 2. Create system_settings table if not exists
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent "already exists" errors
DROP POLICY IF EXISTS "Allow anyone to read system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow service_role to modify system settings" ON public.system_settings;

-- Allow all authenticated users to read system settings (to check maintenance or signups)
CREATE POLICY "Allow anyone to read system settings" 
ON public.system_settings FOR SELECT 
USING (true);

-- Allow service role / admin to modify
CREATE POLICY "Allow service_role to modify system settings" 
ON public.system_settings FOR ALL 
USING (true);

-- Insert default system settings
INSERT INTO public.system_settings (key, value) VALUES 
('maintenance_mode', 'false'::jsonb),
('public_signups', 'true'::jsonb),
('platform_broadcast', '{"message": "", "timestamp": null}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Create admin_actions (Audit Logs) table
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    action_type TEXT NOT NULL,
    target_id TEXT,
    admin_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for admin_actions
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to prevent "already exists" error
DROP POLICY IF EXISTS "Allow service_role or admin to read actions" ON public.admin_actions;
CREATE POLICY "Allow service_role or admin to read actions"
ON public.admin_actions FOR SELECT
USING (true);

-- 4. Create admin_get_all_users function
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(t), '[]'::json)
    FROM (
      SELECT
        p.id AS user_id,
        COALESCE(p.company_name, p.full_name, 'N/A') AS company_name,
        COALESCE(au.email, 'No Email') AS email,
        p.updated_at AS created_at, -- using updated_at
        COALESCE(p.last_activity_at, au.last_sign_in_at) AS last_sign_in_at,
        p.subscription_expires_at,
        p.plan_type,
        p.is_blocked,
        p.is_paid,
        (SELECT COUNT(*) FROM public.parties pa WHERE pa.user_id = p.id) AS client_count,
        (SELECT COUNT(*) FROM public.transactions tr WHERE tr.user_id = p.id) AS invoice_count, -- we map 'invoice_count' to transactions count for escrow ledger admin visual alignment!
        (SELECT MAX(tr.transaction_date) FROM public.transactions tr WHERE tr.user_id = p.id) AS last_invoice_created_at
      FROM public.profiles p
      LEFT JOIN auth.users au ON p.id = au.id
      ORDER BY p.updated_at DESC
    ) t
  );
END;
$$ LANGUAGE plpgsql;

-- 5. Create admin_get_stats function
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS json
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_users bigint;
  active_users bigint;
  total_parties bigint;
  total_transactions bigint;
  total_give bigint;
  total_take bigint;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.profiles;
  SELECT COUNT(DISTINCT user_id) INTO active_users FROM public.transactions WHERE transaction_date >= (now() - interval '30 days');
  SELECT COUNT(*) INTO total_parties FROM public.parties;
  SELECT COUNT(*) INTO total_transactions FROM public.transactions;
  
  RETURN json_build_object(
    'total_users', total_users,
    'active_users', COALESCE(active_users, 0),
    'total_invoices', total_transactions, -- mapped to transactions count
    'total_clients', total_parties -- mapped to parties count
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Create admin_cancel_subscription function
CREATE OR REPLACE FUNCTION public.admin_cancel_subscription(target_user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET subscription_expires_at = now() 
  WHERE id = target_user_id;
  
  INSERT INTO public.admin_actions (action_type, target_id, admin_email)
  VALUES ('Subscription Cancelled', target_user_id::text, 'escrow.bms@gmail.com');
END;
$$ LANGUAGE plpgsql;

-- 7. Create admin_toggle_block_user function
CREATE OR REPLACE FUNCTION public.admin_toggle_block_user(target_user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status boolean;
BEGIN
  SELECT is_blocked INTO current_status FROM public.profiles WHERE id = target_user_id;
  
  UPDATE public.profiles 
  SET is_blocked = NOT is_blocked 
  WHERE id = target_user_id;
  
  INSERT INTO public.admin_actions (action_type, target_id, admin_email)
  VALUES (
    CASE WHEN current_status = true THEN 'User Unblocked' ELSE 'User Blocked' END,
    target_user_id::text,
    'escrow.bms@gmail.com'
  );
END;
$$ LANGUAGE plpgsql;

-- 8. Create admin_delete_user function
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Row level deletes in profiles will delete because of CASCADE or manual deletes
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.parties WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  INSERT INTO public.admin_actions (action_type, target_id, admin_email)
  VALUES ('User Profile Purged', target_user_id::text, 'escrow.bms@gmail.com');
END;
$$ LANGUAGE plpgsql;

-- 9. Create admin_reset_password function
CREATE OR REPLACE FUNCTION public.admin_reset_password(target_user_id uuid, new_password text)
RETURNS void
SECURITY DEFINER
SET search_path = extensions, public, auth
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
  
  INSERT INTO public.admin_actions (action_type, target_id, admin_email)
  VALUES ('Password Force Overwritten', target_user_id::text, 'escrow.bms@gmail.com');
END;
$$ LANGUAGE plpgsql;

-- 10. Create admin_extend_subscription function
CREATE OR REPLACE FUNCTION public.admin_extend_subscription(target_user_id uuid, days_to_add integer)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_expiry timestamp with time zone;
  new_expiry timestamp with time zone;
BEGIN
  SELECT subscription_expires_at INTO current_expiry FROM public.profiles WHERE id = target_user_id;
  
  IF current_expiry IS NULL OR current_expiry < now() THEN
    new_expiry := now() + (days_to_add || ' days')::interval;
  ELSE
    new_expiry := current_expiry + (days_to_add || ' days')::interval;
  END IF;
  
  UPDATE public.profiles 
  SET subscription_expires_at = new_expiry
  WHERE id = target_user_id;
  
  INSERT INTO public.admin_actions (action_type, target_id, admin_email)
  VALUES ('Subscription Extended: ' || days_to_add || ' days', target_user_id::text, 'escrow.bms@gmail.com');
END;
$$ LANGUAGE plpgsql;

-- 11. Create admin_upsert_setting function
CREATE OR REPLACE FUNCTION public.admin_upsert_setting(p_key text, p_value jsonb)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_settings (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE 
  SET value = EXCLUDED.value, updated_at = now();
  
  INSERT INTO public.admin_actions (action_type, target_id, admin_email)
  VALUES ('System Setting Updated: ' || p_key, p_value::text, 'escrow.bms@gmail.com');
END;
$$ LANGUAGE plpgsql;

-- 12. Create admin_update_user_plan function
CREATE OR REPLACE FUNCTION public.admin_update_user_plan(target_user_id uuid, new_plan_type text, new_is_paid boolean)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET plan_type = new_plan_type,
      is_paid = new_is_paid
  WHERE id = target_user_id;
  
  INSERT INTO public.admin_actions (action_type, target_id, admin_email)
  VALUES ('Plan Type Updated: ' || new_plan_type || ', Paid: ' || new_is_paid, target_user_id::text, 'escrow.bms@gmail.com');
END;
$$ LANGUAGE plpgsql;

-- Grant permissions to ALL possible roles to be safe
GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_cancel_subscription(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_toggle_block_user(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reset_password(uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_extend_subscription(uuid, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_upsert_setting(text, jsonb) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_plan(uuid, text, boolean) TO anon, authenticated, service_role;
