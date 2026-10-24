import { supabase, serviceSupabase } from '../lib/supabase';

export interface EscrowBackupPayload {
  app: 'Escrow Account Ledger';
  version: '1.0';
  exported_at: string;
  user_id: string;
  user_email?: string;
  stats: {
    total_parties: number;
    total_transactions: number;
    total_transfer_entries: number;
  };
  profile: any;
  parties: any[];
  transactions: any[];
  transfer_entries?: any[];
  transfer_custom_right_entries?: any[];
  transfer_sheet_status?: any[];
}

export class BackupRestoreService {
  // Generate full JSON snapshot of all user's data
  async generateBackupData(userId: string, userEmail?: string): Promise<EscrowBackupPayload> {
    const client = serviceSupabase || supabase;

    // 1. Fetch Profile
    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // 2. Fetch Parties
    const { data: parties, error: partiesErr } = await client
      .from('parties')
      .select('*')
      .eq('user_id', userId);

    if (partiesErr) throw partiesErr;

    const partyIds = (parties || []).map(p => p.id);

    // 3. Fetch Transactions
    let transactions: any[] = [];
    if (partyIds.length > 0) {
      // Chunk party IDs if many
      const CHUNK_SIZE = 100;
      for (let i = 0; i < partyIds.length; i += CHUNK_SIZE) {
        const slice = partyIds.slice(i, i + CHUNK_SIZE);
        const { data: txSlice, error: txErr } = await client
          .from('transactions')
          .select('*')
          .in('party_id', slice);
        if (txErr) throw txErr;
        if (txSlice) transactions = transactions.concat(txSlice);
      }
    }

    // 4. Fetch Transfer Entries (if available)
    let transferEntries: any[] = [];
    let customRightEntries: any[] = [];
    let transferStatus: any[] = [];

    try {
      const [tRes, cRes, sRes] = await Promise.all([
        client.from('transfer_entries').select('*').eq('user_id', userId),
        client.from('transfer_custom_right_entries').select('*').eq('user_id', userId),
        client.from('transfer_sheet_status').select('*').eq('user_id', userId)
      ]);
      transferEntries = tRes.data || [];
      customRightEntries = cRes.data || [];
      transferStatus = sRes.data || [];
    } catch (e) {
      console.warn('Optional transfer entries fetch skipped:', e);
    }

    const payload: EscrowBackupPayload = {
      app: 'Escrow Account Ledger',
      version: '1.0',
      exported_at: new Date().toISOString(),
      user_id: userId,
      user_email: userEmail,
      stats: {
        total_parties: (parties || []).length,
        total_transactions: transactions.length,
        total_transfer_entries: transferEntries.length
      },
      profile: profile || {},
      parties: parties || [],
      transactions: transactions || [],
      transfer_entries: transferEntries,
      transfer_custom_right_entries: customRightEntries,
      transfer_sheet_status: transferStatus
    };

    return payload;
  }

  // Restore backup data into Supabase
  async restoreBackupData(payload: EscrowBackupPayload, targetUserId: string): Promise<{ partiesCount: number; transactionsCount: number }> {
    if (!payload || !Array.isArray(payload.parties) || !Array.isArray(payload.transactions)) {
      throw new Error('Invalid backup file format. Missing parties or transactions data.');
    }

    const client = serviceSupabase || supabase;

    // 1. Prepare Parties strictly with targetUserId
    const partiesToUpsert = payload.parties.map(p => ({
      ...p,
      user_id: targetUserId
    }));

    const allowedPartyIdSet = new Set(partiesToUpsert.map(p => p.id));

    if (partiesToUpsert.length > 0) {
      const { error: pErr } = await client
        .from('parties')
        .upsert(partiesToUpsert, { onConflict: 'id' });
      if (pErr) throw new Error('Failed to restore parties: ' + pErr.message);
    }

    // 2. Prepare Transactions: strictly ensure party_id belongs to the user's parties
    const transactionsToUpsert = payload.transactions
      .filter(t => t.party_id && allowedPartyIdSet.has(t.party_id))
      .map(t => ({
        ...t
      }));

    if (transactionsToUpsert.length > 0) {
      // Chunk insert/upsert in batches of 100
      const BATCH_SIZE = 100;
      for (let i = 0; i < transactionsToUpsert.length; i += BATCH_SIZE) {
        const batch = transactionsToUpsert.slice(i, i + BATCH_SIZE);
        const { error: tErr } = await client
          .from('transactions')
          .upsert(batch, { onConflict: 'id' });
        if (tErr) throw new Error('Failed to restore transactions batch: ' + tErr.message);
      }
    }

    // 3. Optional Transfer Entries
    if (payload.transfer_entries && payload.transfer_entries.length > 0) {
      try {
        const trEntries = payload.transfer_entries.map(te => ({ ...te, user_id: targetUserId }));
        await client.from('transfer_entries').upsert(trEntries, { onConflict: 'id' });
      } catch (err) {
        console.warn('Transfer entries restore warning:', err);
      }
    }

    if (payload.transfer_custom_right_entries && payload.transfer_custom_right_entries.length > 0) {
      try {
        const crEntries = payload.transfer_custom_right_entries.map(ce => ({ ...ce, user_id: targetUserId }));
        await client.from('transfer_custom_right_entries').upsert(crEntries, { onConflict: 'id' });
      } catch (err) {
        console.warn('Custom right entries restore warning:', err);
      }
    }

    return {
      partiesCount: partiesToUpsert.length,
      transactionsCount: transactionsToUpsert.length
    };
  }

  // Trigger browser download for local offline backup (.json)
  downloadLocalBackup(payload: EscrowBackupPayload, customFileName?: string) {
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = customFileName || `Escrow_Ledger_Backup_${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const backupRestoreService = new BackupRestoreService();
