-- ==========================================================
-- ESCROW LEDGER - DATABASE SECURITY HARDENING MIGRATION
-- ==========================================================

-- 1. Helper Function to Check Admin Privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT (auth.jwt() ->> 'email') = 'escrow.bms@gmail.com';
$$;

-- 2. Restrict system_settings table to admin-only modifications
DROP POLICY IF EXISTS "Allow service_role to modify system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow anyone to read system settings" ON public.system_settings;

CREATE POLICY "Allow anyone to read system settings" 
ON public.system_settings FOR SELECT 
USING (true);

CREATE POLICY "Allow admin to modify system settings" 
ON public.system_settings FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Restrict admin_actions table to admin-only access
DROP POLICY IF EXISTS "Allow service_role or admin to read actions" ON public.admin_actions;

CREATE POLICY "Allow admin to view admin actions"
ON public.admin_actions FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Allow admin to insert admin actions"
ON public.admin_actions FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- 4. Secure admin RPC functions against unauthorized execution
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS json
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(t), '[]'::json)
    FROM (
      SELECT
        p.id AS user_id,
        COALESCE(p.company_name, p.full_name, 'N/A') AS company_name,
        COALESCE(au.email, 'No Email') AS email,
        p.updated_at AS created_at,
        COALESCE(p.last_activity_at, au.last_sign_in_at) AS last_sign_in_at,
        p.subscription_expires_at,
        p.plan_type,
        p.is_blocked,
        p.is_paid,
        (SELECT COUNT(*) FROM public.parties pa WHERE pa.user_id = p.id) AS client_count,
        (SELECT COUNT(*) FROM public.transactions tr WHERE tr.user_id = p.id) AS invoice_count,
        (SELECT MAX(tr.transaction_date) FROM public.transactions tr WHERE tr.user_id = p.id) AS last_invoice_created_at
      FROM public.profiles p
      LEFT JOIN auth.users au ON p.id = au.id
      WHERE au.email IS DISTINCT FROM 'escrow.bms@gmail.com'
      ORDER BY p.updated_at DESC
    ) t
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS json
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  total_users bigint;
  active_users bigint;
  total_parties bigint;
  total_transactions bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT count(*) INTO total_users 
  FROM auth.users 
  WHERE email IS DISTINCT FROM 'escrow.bms@gmail.com';
  
  SELECT count(*) INTO active_users 
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE au.email IS DISTINCT FROM 'escrow.bms@gmail.com'
    AND COALESCE(p.last_activity_at, au.last_sign_in_at) >= (now() - interval '30 days');

  SELECT count(*) INTO total_parties FROM public.parties;
  SELECT count(*) INTO total_transactions FROM public.transactions;

  RETURN json_build_object(
    'total_users', COALESCE(total_users, 0),
    'active_users', COALESCE(active_users, 0),
    'total_clients', COALESCE(total_parties, 0),
    'total_invoices', COALESCE(total_transactions, 0)
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.admin_toggle_user_block(target_user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_status boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

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

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.parties WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
  
  INSERT INTO public.admin_actions (action_type, target_id, admin_email)
  VALUES ('User Profile Purged', target_user_id::text, 'escrow.bms@gmail.com');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.admin_reset_password(target_user_id uuid, new_password text)
RETURNS void
SECURITY DEFINER
SET search_path = extensions, public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
  
  INSERT INTO public.admin_actions (action_type, target_id, admin_email)
  VALUES ('Password Force Overwritten', target_user_id::text, 'escrow.bms@gmail.com');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.admin_extend_subscription(target_user_id uuid, days_to_add integer)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_expiry timestamp with time zone;
  new_expiry timestamp with time zone;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

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

CREATE OR REPLACE FUNCTION public.admin_upsert_setting(p_key text, p_value jsonb)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  INSERT INTO public.system_settings (key, value, updated_at)
  VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE 
  SET value = EXCLUDED.value, updated_at = now();
  
  INSERT INTO public.admin_actions (action_type, target_id, admin_email)
  VALUES ('System Setting Updated: ' || p_key, p_value::text, 'escrow.bms@gmail.com');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.admin_update_user_plan(target_user_id uuid, new_plan_type text, new_is_paid boolean)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  UPDATE public.profiles
  SET 
    plan_type = new_plan_type,
    is_paid = new_is_paid
  WHERE id = target_user_id;

  INSERT INTO public.admin_actions (action_type, target_id, admin_email)
  VALUES ('Plan Type Updated: ' || new_plan_type, target_user_id::text, 'escrow.bms@gmail.com');
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to prevent non-admin users from altering their subscription & status fields
CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.is_blocked := OLD.is_blocked;
    NEW.is_paid := OLD.is_paid;
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.plan_type := OLD.plan_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_admin_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_admin_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_admin_fields();
