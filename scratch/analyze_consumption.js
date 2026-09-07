import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nivmzcshpgftlbjdmvtk.supabase.co';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function analyze() {
  try {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: parties } = await supabase.from('parties').select('id, user_id, party_name, created_at, status');

    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.id] = p;
    });

    console.log(`=======================================================`);
    console.log(`DATABASE OVERVIEW`);
    console.log(`=======================================================`);
    const { count: totalTx } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    console.log(`Total Transactions in DB: ${totalTx}`);
    console.log(`Total Parties: ${parties?.length || 0}`);
    console.log(`Total User Profiles: ${profiles?.length || 0}`);

    // Analyze each user profile
    for (const profile of profiles) {
      const uid = profile.id;
      const { count: userTxCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid);

      if (!userTxCount || userTxCount === 0) {
        console.log(`\nAccount: ${profile.full_name} (${profile.company_name}) - 0 transactions`);
        continue;
      }

      // Find earliest and latest transaction
      const { data: earliest } = await supabase
        .from('transactions')
        .select('created_at, transaction_date')
        .eq('user_id', uid)
        .order('created_at', { ascending: true })
        .limit(1);

      const { data: latest } = await supabase
        .from('transactions')
        .select('created_at, transaction_date')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1);

      const firstDate = new Date(earliest?.[0]?.created_at || earliest?.[0]?.transaction_date);
      const lastDate = new Date(latest?.[0]?.created_at || latest?.[0]?.transaction_date);
      const spanDays = Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Recent 7 days, 30 days, 90 days count
      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const { count: count7 } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('created_at', d7);

      const { count: count30 } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('created_at', d30);

      const { count: count90 } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .gte('created_at', d90);

      // Check finalized vs active
      const { count: finalizedCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', uid)
        .eq('is_finalized', true);

      const activeCount = userTxCount - (finalizedCount || 0);

      console.log(`\n=======================================================`);
      console.log(`ACCOUNT: ${profile.full_name?.toUpperCase()} [Company: ${profile.company_name}]`);
      console.log(`User ID: ${uid}`);
      console.log(`Total Transactions: ${userTxCount.toLocaleString()} (${((userTxCount / totalTx) * 100).toFixed(1)}% of all DB transactions)`);
      console.log(`Finalized (Old Record): ${(finalizedCount || 0).toLocaleString()} | Active: ${activeCount.toLocaleString()}`);
      console.log(`First Transaction Date: ${firstDate.toISOString().slice(0, 10)}`);
      console.log(`Latest Transaction Date: ${lastDate.toISOString().slice(0, 10)} (Active for ~${spanDays} days)`);
      console.log(`--- Consumption Velocity ---`);
      console.log(`  • Overall Lifetime Average: ${(userTxCount / spanDays).toFixed(1)} tx/day (~${((userTxCount / spanDays) * 7).toFixed(0)} tx/week, ~${((userTxCount / spanDays) * 30).toFixed(0)} tx/month)`);
      console.log(`  • Last 90 Days: ${count90} tx (~${(count90 / 90).toFixed(1)} tx/day)`);
      console.log(`  • Last 30 Days: ${count30} tx (~${(count30 / 30).toFixed(1)} tx/day)`);
      console.log(`  • Last 7 Days: ${count7} tx (~${(count7 / 7).toFixed(1)} tx/day)`);

      // Top parties for this user
      const userParties = parties?.filter(p => p.user_id === uid) || [];
      console.log(`Total Parties under this account: ${userParties.length}`);

      // Query party distribution by sampling or counting top parties
      const partyCounts = [];
      for (const p of userParties) {
        const { count: pTxCount } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('party_id', p.id);
        if (pTxCount > 0) {
          partyCounts.push({ name: p.party_name, count: pTxCount });
        }
      }
      partyCounts.sort((a, b) => b.count - a.count);
      console.log(`Top 5 Heaviest Parties:`);
      partyCounts.slice(0, 5).forEach((p, idx) => {
        console.log(`  ${idx + 1}. ${p.name}: ${p.count.toLocaleString()} tx`);
      });
    }

    console.log(`\n=======================================================`);
    console.log(`STORAGE AND CAPACITY IMPLICATIONS`);
    console.log(`=======================================================`);
    // Estimate storage per transaction row + index: ~1.2 KB in Postgres (data + 5 indexes on user_id, party_id, created_at, is_finalized, linked_tx_id)
    const rowAndIndexKB = 1.2;
    const totalStorageMB = (totalTx * rowAndIndexKB / 1024).toFixed(2);
    console.log(`Total DB Storage Used by Transactions: ~${totalStorageMB} MB`);
    console.log(`Supabase Free Tier DB Limit: 500 MB`);
    console.log(`Supabase Free Tier Capacity: ~400,000 transactions`);
    console.log(`Current Capacity Used: ${((totalTx / 400000) * 100).toFixed(1)}%`);

  } catch (err) {
    console.error('Error in analyze:', err);
  }
}

analyze();
