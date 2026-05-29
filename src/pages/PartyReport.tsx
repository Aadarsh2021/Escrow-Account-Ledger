import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Edit3, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Save,
  RefreshCcw,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GlobalLoader } from '../components/ui/GlobalLoader';

interface Party {
  id: string;
  party_name: string;
  sr_no: string;
  status: 'take' | 'give';
  commission_type: 'with' | 'without';
  commission_rate: number;
  monday_final: boolean;
  system_type: 'normal' | 'commission' | 'company';
  created_at: string;
}

const ITEMS_PER_PAGE = 10;

const PartyReport = () => {
  const navigate = useNavigate();
  const [parties, setParties] = useState<Party[]>(() => {
    try {
      const cached = localStorage.getItem('cached_parties_report');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_parties_report');
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Find first case-insensitive start-matching party for inline ghost autocomplete
  const firstReportMatch = searchQuery
    ? parties.find(p => p.party_name.toLowerCase().startsWith(searchQuery.toLowerCase()) || p.sr_no.toLowerCase().startsWith(searchQuery.toLowerCase()))
    : null;
  
  // Edit State
  const [editingParty, setEditingParty] = useState<Party | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Party>>({});
  const [saving, setSaving] = useState(false);

  // Checklist selection states
  const [selectedPartyIds, setSelectedPartyIds] = useState<Set<string>>(new Set());

  // Bulk Edit Commission States
  const [isBulkCommModalOpen, setIsBulkCommModalOpen] = useState(false);
  const [bulkTakeCommRate, setBulkTakeCommRate] = useState('');
  const [bulkGiveCommRate, setBulkGiveCommRate] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const selectedPartiesList = parties.filter(p => selectedPartyIds.has(p.id));
  const selectedTakeCount = selectedPartiesList.filter(p => p.status === 'take').length;
  const selectedGiveCount = selectedPartiesList.filter(p => p.status === 'give').length;

  const toggleSelectParty = (partyId: string) => {
    const newSelected = new Set(selectedPartyIds);
    if (newSelected.has(partyId)) {
      newSelected.delete(partyId);
    } else {
      newSelected.add(partyId);
    }
    setSelectedPartyIds(newSelected);
  };



  const handleBulkCommSave = async () => {
    const takeRate = parseFloat(bulkTakeCommRate);
    const giveRate = parseFloat(bulkGiveCommRate);

    const isBulkAllMode = selectedPartyIds.size === 0;

    const wantsTakeUpdate = bulkTakeCommRate.trim() !== '';
    const wantsGiveUpdate = bulkGiveCommRate.trim() !== '';

    if (wantsTakeUpdate && (isNaN(takeRate) || takeRate < 0)) {
      alert('Please enter a valid rate for Take parties.');
      return;
    }
    if (wantsGiveUpdate && (isNaN(giveRate) || giveRate < 0)) {
      alert('Please enter a valid rate for Give parties.');
      return;
    }

    if (!wantsTakeUpdate && !wantsGiveUpdate) {
      alert('Please enter at least one commission rate to update.');
      return;
    }

    setBulkSaving(true);
    try {
      if (isBulkAllMode) {
        if (wantsTakeUpdate) {
          const { error } = await supabase
            .from('parties')
            .update({ commission_rate: takeRate })
            .eq('status', 'take')
            .eq('system_type', 'normal');
          if (error) throw error;
        }

        if (wantsGiveUpdate) {
          const { error } = await supabase
            .from('parties')
            .update({ commission_rate: giveRate })
            .eq('status', 'give')
            .eq('system_type', 'normal');
          if (error) throw error;
        }

        // Update local state for all normal parties
        setParties(parties.map(p => {
          if (p.system_type !== 'normal') return p;
          let updatedParty = { ...p };
          if (p.status === 'take' && wantsTakeUpdate) {
            updatedParty.commission_rate = takeRate;
          }
          if (p.status === 'give' && wantsGiveUpdate) {
            updatedParty.commission_rate = giveRate;
          }
          return updatedParty;
        }));
      } else {
        const takeIds = selectedPartiesList.filter(p => p.status === 'take').map(p => p.id);
        const giveIds = selectedPartiesList.filter(p => p.status === 'give').map(p => p.id);

        if (takeIds.length > 0 && wantsTakeUpdate) {
          const { error } = await supabase
            .from('parties')
            .update({ commission_rate: takeRate })
            .in('id', takeIds);
          if (error) throw error;
        }

        if (giveIds.length > 0 && wantsGiveUpdate) {
          const { error } = await supabase
            .from('parties')
            .update({ commission_rate: giveRate })
            .in('id', giveIds);
          if (error) throw error;
        }

        // Update local state for selected parties
        setParties(parties.map(p => {
          if (!selectedPartyIds.has(p.id)) return p;
          if (p.status === 'take' && wantsTakeUpdate) {
            return { ...p, commission_rate: takeRate };
          }
          if (p.status === 'give' && wantsGiveUpdate) {
            return { ...p, commission_rate: giveRate };
          }
          return p;
        }));
      }

      setSelectedPartyIds(new Set());
      setBulkTakeCommRate('');
      setBulkGiveCommRate('');
      setIsBulkCommModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update commission rates: ' + (err as any).message);
    } finally {
      setBulkSaving(false);
    }
  };

  useEffect(() => {
    fetchParties();

    const partiesChannel = supabase.channel('party-report-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties' }, () => {
        fetchParties();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(partiesChannel);
    };
  }, []);

  const fetchParties = async () => {
    try {
      const { data, error } = await supabase.from('parties').select('*').order('party_name', { ascending: true });
      if (error) throw error;
      const cleanData = data || [];
      setParties(cleanData);
      try {
        localStorage.setItem('cached_parties_report', JSON.stringify(cleanData));
      } catch (e) {
        console.error('Error caching parties report:', e);
      }
    } catch (err) { 
      console.error(err); 
      alert("Error fetching parties (Report): " + JSON.stringify(err));
    } finally { 
      setLoading(false); 
    }
  };

  const handleEdit = (party: Party) => {
    setEditingParty(party);
    setEditFormData({ ...party });
  };

  const handleSaveEdit = async () => {
    if (!editingParty || !editFormData.party_name) return;
    setSaving(true);
    try {
      // Logic for triggering Monday Final if status is changed to 'Yes' manually
      if (editFormData.monday_final === true && editingParty.monday_final === false) {
        const confirmMerge = window.confirm(`You are manually setting Monday Final to 'Yes' for ${editFormData.party_name}. This will archive all existing transactions and create a settlement entry. Proceed?`);
        if (!confirmMerge) {
          setSaving(false);
          return;
        }

        // 1. Fetch active transactions to get closing balance and archive them
        const { data: activeTns } = await supabase
          .from('transactions')
          .select('*')
          .eq('party_id', editingParty.id)
          .neq('is_finalized', true)
          .order('transaction_date', { ascending: true });

        if (activeTns && activeTns.length > 0) {
          const closingBal = activeTns[activeTns.length - 1].balance;
          const tnsType = closingBal >= 0 ? 'CR' : 'DR';
          const credit = closingBal >= 0 ? closingBal : 0;
          const debit = closingBal < 0 ? Math.abs(closingBal) : 0;

          // 2. Create settlement record
          const { data: settlement, error: sErr } = await supabase.from('transactions').insert([{
            party_id: editingParty.id,
            remarks: 'MONDAY FINAL SETTLEMENT (MANUAL)',
            tns_type: tnsType,
            credit,
            debit,
            balance: closingBal,
            is_settlement: true,
            is_finalized: false
          }]).select().single();

          if (sErr) throw sErr;

          // 3. Archive old records
          const oldIds = activeTns.map(t => t.id);
          await supabase.from('transactions').update({ is_finalized: true, settlement_id: settlement.id }).in('id', oldIds);
        }
      }

      const { error } = await supabase
        .from('parties')
        .update({
          party_name: editFormData.party_name,
          status: editFormData.status,
          commission_rate: parseFloat(editFormData.commission_rate?.toString() || '0'),
          monday_final: editFormData.monday_final
        })
        .eq('id', editingParty.id);

      if (error) throw error;
      
      setParties(parties.map(p => p.id === editingParty.id ? { ...p, ...editFormData } as Party : p));
      setEditingParty(null);
    } catch (err) {
      console.error(err);
      alert("Error saving changes: " + (err as any).message);
    } finally {
      setSaving(false);
    }
  };

  const filteredParties = parties.filter(p => 
    p.party_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sr_no.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredParties.length / ITEMS_PER_PAGE);
  const paginatedParties = filteredParties.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const normalFilteredParties = filteredParties.filter(p => p.system_type === 'normal');
  const isAllFilteredNormalSelected = normalFilteredParties.length > 0 && normalFilteredParties.every(p => selectedPartyIds.has(p.id));
  const isSomeFilteredNormalSelected = normalFilteredParties.length > 0 && !isAllFilteredNormalSelected && normalFilteredParties.some(p => selectedPartyIds.has(p.id));

  const toggleSelectAllParties = () => {
    if (isAllFilteredNormalSelected) {
      const newSelected = new Set(selectedPartyIds);
      normalFilteredParties.forEach(p => newSelected.delete(p.id));
      setSelectedPartyIds(newSelected);
    } else {
      const newSelected = new Set(selectedPartyIds);
      normalFilteredParties.forEach(p => newSelected.add(p.id));
      setSelectedPartyIds(newSelected);
    }
  };

  if (loading) return <GlobalLoader fullScreen={true} />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 dark:shadow-none">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Party Reports</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage all your registered parties and account settings.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsBulkCommModalOpen(true)}
            className="flex items-center gap-1.5 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none rounded-2xl font-bold text-sm transition-all whitespace-nowrap"
          >
            <Edit3 className="w-4 h-4" />
            Bulk Commission {selectedPartyIds.size > 0 ? `(${selectedPartyIds.size})` : ''}
          </button>
          <div className="relative w-full md:w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus-within:ring-4 focus-within:ring-emerald-600/10 focus-within:border-emerald-600 rounded-2xl transition-all flex items-center">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10" />
            {firstReportMatch && (
              <div className="absolute inset-0 pl-12 pr-6 py-3.5 pointer-events-none flex items-center font-medium text-slate-400 dark:text-slate-500 select-none z-0">
                <span className="text-transparent">{searchQuery}</span>
                <span className="inline-flex items-center gap-1.5 bg-emerald-50/95 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 rounded-lg px-2 py-0.5 text-xs font-bold ml-1 shadow-sm shrink-0 animate-in fade-in-50 zoom-in-95 duration-150">
                  {firstReportMatch.party_name.slice(searchQuery.length)}
                  <kbd className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/50 rounded px-1 text-[9px] text-emerald-500 font-bold shadow-xs">TAB</kbd>
                </span>
              </div>
            )}
            <input 
              placeholder="Search by name or SR NO..." 
              className="w-full pl-12 pr-6 py-3.5 bg-transparent outline-none font-medium relative z-10 text-slate-800 dark:text-white"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === 'Tab') && firstReportMatch) {
                  e.preventDefault();
                  handleEdit(firstReportMatch);
                  setSearchQuery('');
                }
              }}
            />
          </div>
          <button 
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100 dark:shadow-none rounded-2xl font-bold text-sm transition-all whitespace-nowrap"
          >
            <XCircle className="w-4 h-4" />
            Exit
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden transition-colors duration-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-100 dark:border-slate-800">
              <tr className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                <th className="px-6 py-5 text-center w-12">
                  <div 
                    onClick={toggleSelectAllParties} 
                    className={`w-4 h-4 rounded border-2 mx-auto cursor-pointer transition-all flex items-center justify-center ${
                      isAllFilteredNormalSelected 
                        ? 'bg-emerald-600 border-emerald-600' 
                        : isSomeFilteredNormalSelected 
                          ? 'border-emerald-600' 
                          : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isAllFilteredNormalSelected && (
                      <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>
                    )}
                    {isSomeFilteredNormalSelected && (
                      <div className="w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-455 rounded-sm"></div>
                    )}
                  </div>
                </th>
                <th className="px-6 py-5">SR NO</th>
                <th className="px-8 py-5">Party Name</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-center">Monday Final</th>
                <th className="px-8 py-5 text-right">Commission Rate</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800 font-medium">
              {paginatedParties.map((p) => (
                <tr key={p.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors ${selectedPartyIds.has(p.id) ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''}`}>
                  <td className="px-6 py-5 text-center">
                    {p.system_type === 'normal' ? (
                      <div 
                        onClick={() => toggleSelectParty(p.id)} 
                        className={`w-5 h-5 rounded-lg border-2 mx-auto cursor-pointer transition-all flex items-center justify-center ${
                          selectedPartyIds.has(p.id) 
                            ? 'bg-emerald-600 border-emerald-600 shadow-md shadow-emerald-100 dark:shadow-none' 
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className={`w-2 h-2 bg-white rounded-sm transition-opacity ${selectedPartyIds.has(p.id) ? 'opacity-100' : 'opacity-0'}`}></div>
                      </div>
                    ) : (
                      <div className="w-5 h-5 mx-auto" />
                    )}
                  </td>
                  <td className="px-6 py-5 font-bold text-slate-400 dark:text-slate-500">{p.sr_no}</td>
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900 dark:text-white text-lg">{p.party_name}</div>
                    {p.system_type !== 'normal' && <span className="text-[9px] bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full uppercase font-black">System Account</span>}
                  </td>
                  <td className="px-8 py-5">
                    {p.system_type === 'normal' ? (
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'take' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'}`}>
                        {p.status}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600 font-bold">-</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className={`mx-auto w-24 py-1.5 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-2 ${((p.monday_final as any) === true || (p.monday_final as any) === 'true') ? 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-450' : 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-450'}`}>
                      {((p.monday_final as any) === true || (p.monday_final as any) === 'true') ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {((p.monday_final as any) === true || (p.monday_final as any) === 'true') ? 'Yes' : 'No'}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-600 dark:text-slate-300 text-lg">
                    {p.system_type === 'normal' ? `${p.commission_rate}%` : '-'}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {p.system_type === 'normal' && (
                        <>
                          <button 
                            onClick={() => handleEdit(p)}
                            className="p-2.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button className="p-2.5 text-rose-450 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedParties.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-slate-400 dark:text-slate-500 italic">No parties found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/30">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2 text-slate-600 dark:text-slate-400">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 transition-all">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-white dark:hover:bg-slate-900 disabled:opacity-30 transition-all">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {editingParty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingParty(null)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Edit Party Details</h3>
              <button onClick={() => setEditingParty(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Party Name</label>
                <input 
                  className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none font-bold"
                  value={editFormData.party_name}
                  onChange={(e) => setEditFormData({ ...editFormData, party_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Status</label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none font-bold"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                  >
                    <option value="take">Take</option>
                    <option value="give">Give</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Comm. Rate (%)</label>
                  <input 
                    type="number"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none font-bold"
                    value={editFormData.commission_rate}
                    onChange={(e) => setEditFormData({ ...editFormData, commission_rate: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Monday Final Status</label>
                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, monday_final: true })}
                    className={`flex-grow py-3 rounded-xl font-bold transition-all ${editFormData.monday_final ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400'}`}
                  >
                    Yes (Finalised)
                  </button>
                  <button 
                    type="button"
                    disabled={editingParty?.monday_final === true}
                    onClick={() => setEditFormData({ ...editFormData, monday_final: false })}
                    className={`flex-grow py-3 rounded-xl font-bold transition-all ${editingParty?.monday_final === true ? 'bg-slate-100 dark:bg-slate-950 text-slate-300 dark:text-slate-600 cursor-not-allowed' : (!editFormData.monday_final ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400')}`}
                  >
                    No (Pending)
                  </button>
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setEditingParty(null)}
                  className="flex-grow py-4 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-grow py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isBulkCommModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { if (!bulkSaving) setIsBulkCommModalOpen(false); }} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Change Commission Rate</h3>
              <button disabled={bulkSaving} onClick={() => setIsBulkCommModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all disabled:opacity-30 disabled:pointer-events-none">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm font-bold text-slate-500 dark:text-slate-400 text-center">
                {selectedPartyIds.size > 0 ? (
                  <>Updating rates for <span className="text-emerald-600 dark:text-emerald-455 font-black">{selectedPartyIds.size}</span> selected parties ({selectedTakeCount} Take, {selectedGiveCount} Give).</>
                ) : (
                  <>Updating commission rates for <span className="text-emerald-600 dark:text-emerald-455 font-black">ALL</span> registered normal parties.</>
                )}
              </div>
              
              {(selectedPartyIds.size === 0 || selectedTakeCount > 0) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    Take Parties Comm. Rate (%) <span className="text-emerald-600">{selectedPartyIds.size > 0 ? `(${selectedTakeCount} selected)` : '(All)'}</span>
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2.0"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none font-black text-lg"
                    value={bulkTakeCommRate}
                    onChange={(e) => setBulkTakeCommRate(e.target.value)}
                  />
                </div>
              )}

              {(selectedPartyIds.size === 0 || selectedGiveCount > 0) && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                    Give Parties Comm. Rate (%) <span className="text-rose-600">{selectedPartyIds.size > 0 ? `(${selectedGiveCount} selected)` : '(All)'}</span>
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="e.g. 3.5"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none font-black text-lg"
                    value={bulkGiveCommRate}
                    onChange={(e) => setBulkGiveCommRate(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button 
                  disabled={bulkSaving}
                  onClick={() => setIsBulkCommModalOpen(false)}
                  className="flex-grow py-4 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkCommSave}
                  disabled={
                    bulkSaving || 
                    (bulkTakeCommRate.trim() !== '' && (isNaN(parseFloat(bulkTakeCommRate)) || parseFloat(bulkTakeCommRate) < 0)) || 
                    (bulkGiveCommRate.trim() !== '' && (isNaN(parseFloat(bulkGiveCommRate)) || parseFloat(bulkGiveCommRate) < 0)) || 
                    (bulkTakeCommRate.trim() === '' && bulkGiveCommRate.trim() === '')
                  }
                  className="flex-grow py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {bulkSaving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Apply Rate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartyReport;
