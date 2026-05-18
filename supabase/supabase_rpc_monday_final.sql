-- SQL Function for Bulletproof Monday Final Settlement
-- Run this in your Supabase SQL Editor

create or replace function public.execute_monday_final(
  p_party_id uuid, 
  p_user_id uuid, 
  p_closing_balance numeric, 
  p_remarks text
)
returns void as $$
declare
  v_settlement_id uuid;
  v_tns_type text;
  v_credit numeric;
  v_debit numeric;
begin
  -- Calculate Credit/Debit based on closing balance
  v_tns_type := case when p_closing_balance >= 0 then 'CR' else 'DR' end;
  v_credit := case when p_closing_balance >= 0 then p_closing_balance else 0 end;
  v_debit := case when p_closing_balance < 0 then abs(p_closing_balance) else 0 end;

  -- 1. Insert the single Settlement Record
  insert into public.transactions (party_id, remarks, tns_type, credit, debit, balance, is_settlement, is_finalized, user_id)
  values (p_party_id, p_remarks, v_tns_type, v_credit, v_debit, p_closing_balance, true, false, p_user_id)
  returning id into v_settlement_id;

  -- 2. Archive all old active records for this party
  -- Security Definer bypasses RLS, so even old records without a user_id will be successfully archived.
  update public.transactions
  set is_finalized = true, settlement_id = v_settlement_id
  where party_id = p_party_id 
    and id != v_settlement_id 
    and (is_finalized = false or is_finalized is null);

  -- 3. Update the Party status
  update public.parties
  set monday_final = true
  where id = p_party_id;

end;
$$ language plpgsql security definer;
