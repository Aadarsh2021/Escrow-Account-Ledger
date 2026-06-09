import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  RefreshCcw, 
  XCircle, 
  Printer, 
  Trash2, 
  Plus, 
  Check, 
  ChevronDown, 
  ArrowRightLeft,
  Info,
  Pencil,
  X,
  GripVertical
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { GlobalLoader } from '../components/ui/GlobalLoader';

interface PartyBalance {
  id: string;
  party_name: string;
  sr_no: string;
  status: 'take' | 'give';
  system_type: 'normal' | 'commission' | 'escrow';
  balance: number;
}

interface LeftEntry {
  id: string; // Row ID in Supabase
  partyId: string;
  partyName: string;
  amount: number;
  finalAmount: number;
}

interface RightEntry {
  id?: string; // Row ID in Supabase if custom
  partyId?: string; // Undefined if custom
  partyName: string;
  balance: number;
  isCustom: boolean;
}


interface LeftEntry { id: string; partyId: string; partyName: string; amount: number; finalAmount: number; }
const LeftSortableRow = memo(function LeftSortableRow({ entry, idx, onEdit, onDelete }: {
  entry: LeftEntry;
  idx: number;
  onEdit: (idx: number) => void;
  onDelete: (idx: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    position: isDragging ? 'relative' as const : undefined,
    zIndex: isDragging ? 999 : undefined,
  };
  const rowColor = getLeftRowColor(idx);
  return (
    <tr ref={setNodeRef} style={style} className={`${rowColor} hover:opacity-90 transition-opacity`}>
      <td className="py-2.5 px-3 border-r border-b border-[#D9D9D9] dark:border-slate-700 text-center font-black">
        {idx + 1}
      </td>
      <td className="py-2.5 px-3 border-r border-b border-[#D9D9D9] dark:border-slate-700 font-extrabold max-w-[140px] truncate" title={entry.partyName}>
        {entry.partyName}
      </td>
      <td className={`py-2.5 px-3 text-right border-r border-b border-[#D9D9D9] dark:border-slate-700 font-bold ${entry.amount >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
        {entry.amount < 0 ? '- ' : ''}₹ {Math.round(Math.abs(entry.amount)).toLocaleString('en-IN')}
      </td>
      <td className={`py-2.5 px-3 text-right border-r border-b border-[#D9D9D9] dark:border-slate-700 font-black text-sm ${entry.finalAmount >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
        {entry.finalAmount < 0 ? '- ' : ''}₹ {Math.round(Math.abs(entry.finalAmount)).toLocaleString('en-IN')}
      </td>
      <td className="py-2.5 px-2 text-center border-b border-[#D9D9D9] dark:border-slate-700 print:hidden">
        <div className="flex items-center justify-center gap-1">
          <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 touch-none select-none" title="Drag to reorder">
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <button onClick={() => onEdit(idx)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded transition-all active:scale-90" title="Edit balance">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(idx)} className="p-1 hover:bg-red-900/20 text-red-700 dark:text-red-400 rounded transition-all active:scale-90" title="Delete entry">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

// ─── Right Table Sortable Row ────────────────────────────────────────────────
interface RightEntry2 { id?: string; partyId?: string; partyName: string; balance: number; isCustom: boolean; }
const RightSortableRow = memo(function RightSortableRow({ entry, idx, onEdit, onDelete }: {
  entry: RightEntry2;
  idx: number;
  onEdit: (id: string, name: string, currentBal: number, isCustom: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id! });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    position: isDragging ? 'relative' as const : undefined,
    zIndex: isDragging ? 999 : undefined,
  };
  const displayBal = entry.isCustom ? entry.balance : -entry.balance;
  const rowColor = getRightRowColor(entry as RightEntry, idx);
  return (
    <tr ref={setNodeRef} style={style} className={`${rowColor} hover:opacity-90 transition-opacity`}>
      <td className="py-2.5 px-3 border-r border-b border-[#D9D9D9] dark:border-slate-700 font-extrabold max-w-[180px] truncate" title={entry.partyName}>
        {entry.partyName}
      </td>
      <td className={`py-2.5 px-3 text-right border-r border-b border-[#D9D9D9] dark:border-slate-700 font-black ${displayBal >= 0 ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
        {displayBal < 0 ? '- ' : ''}₹ {Math.round(Math.abs(displayBal)).toLocaleString('en-IN')}
      </td>
      <td className="py-2.5 px-2 text-center border-b border-[#D9D9D9] dark:border-slate-700 print:hidden">
        <div className="flex items-center justify-center gap-1">
          <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 touch-none select-none" title="Drag to reorder">
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <button onClick={() => onEdit(entry.id!, entry.partyName, displayBal, entry.isCustom)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded transition-all active:scale-90" title="Edit balance">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(entry.id!)} className="p-1 hover:bg-red-900/20 text-red-700 dark:text-red-400 rounded transition-all active:scale-90" title="Delete entry">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});
// ─────────────────────────────────────────────────────────────────────────────

const generateUUID = () => {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
};

const getLeftRowColor = (idx: number) => {
  // First 3: Vivid Amber/Gold
  if (idx < 3) {
    return 'bg-[#FFD966] text-slate-900 dark:bg-[#4a3a00] dark:text-[#FFD966] border-[#C9A800] dark:border-slate-700';
  }
  // Next 2: Deep Cyan/Teal
  if (idx < 5) {
    return 'bg-[#47C5CB] text-slate-900 dark:bg-[#063d42] dark:text-[#47C5CB] border-[#2a9ea5] dark:border-slate-700';
  }
  // Next 3: Vivid Green
  if (idx < 8) {
    return 'bg-[#92D050] text-slate-900 dark:bg-[#1e3d04] dark:text-[#92D050] border-[#5fa020] dark:border-slate-700';
  }
  // Next 2: Deep Red/Rose
  if (idx < 10) {
    return 'bg-[#FF7070] text-white dark:bg-[#5c0a0a] dark:text-[#FF9999] border-[#cc3333] dark:border-slate-700';
  }
  // Remaining: Deep Blue
  return 'bg-[#9DC3E6] text-slate-900 dark:bg-[#0d2a45] dark:text-[#9DC3E6] border-[#5a96c9] dark:border-slate-700';
};

const getRightRowColor = (entry: RightEntry, idx: number) => {
  if (entry.isCustom) {
    // Custom: Red, Yellow, Green, Dark Blue (4 colors)
    const customColors = [
      'bg-[#E53935] text-white dark:bg-[#4a0808] dark:text-[#FF8A80] border-[#b71c1c] dark:border-slate-700',        // Red
      'bg-[#FDD835] text-slate-900 dark:bg-[#4a3b00] dark:text-[#FDD835] border-[#c6a800] dark:border-slate-700',    // Yellow
      'bg-[#43A047] text-white dark:bg-[#0a2e0c] dark:text-[#A5D6A7] border-[#1B5E20] dark:border-slate-700',        // Green
      'bg-[#1565C0] text-white dark:bg-[#051540] dark:text-[#90CAF9] border-[#0D47A1] dark:border-slate-700',        // Dark Blue
    ];
    return customColors[idx % customColors.length];
  } else {
    // Save & Sync ke baad wale DB entries: Lavender
    return 'bg-[#B39DDB] text-slate-900 dark:bg-[#2a1a4a] dark:text-[#D1C4E9] border-[#7B52AB] dark:border-slate-700';
  }
};

const TransferEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Drag sensors — must be declared at top level (Rules of Hooks)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [parties, setParties] = useState<PartyBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbMissing, setDbMissing] = useState(false);

  // Left Table Form State
  const [selectedParty, setSelectedParty] = useState<PartyBalance | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Right Table Custom Form State
  const [customRightName, setCustomRightName] = useState('');
  const [customRightBalance, setCustomRightBalance] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<{
    type: 'left' | 'right';
    id: string;
    idx?: number;
    name: string;
    value: number;
    isCustom?: boolean;
  } | null>(null);
  const [editModalInputValue, setEditModalInputValue] = useState('');

  const [deductionInput, setDeductionInput] = useState(() => {
    try {
      return localStorage.getItem('transfer_deduction_input') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('transfer_deduction_input', deductionInput);
    } catch (e) {
      console.error('Error saving deductionInput:', e);
    }
  }, [deductionInput]);

  // Left & Right Tables State
  const [leftEntries, setLeftEntries] = useState<LeftEntry[]>(() => {
    try {
      const cached = localStorage.getItem('transfer_left_entries');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [customRightEntries, setCustomRightEntries] = useState<RightEntry[]>(() => {
    try {
      const cached = localStorage.getItem('transfer_custom_right_entries');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    try {
      const cached = localStorage.getItem('transfer_is_saved');
      return cached === 'true';
    } catch {
      return false;
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync states to localStorage as fallback
  useEffect(() => {
    try {
      localStorage.setItem('transfer_left_entries', JSON.stringify(leftEntries));
    } catch (e) {
      console.error('Error saving left entries:', e);
    }
  }, [leftEntries]);

  useEffect(() => {
    try {
      localStorage.setItem('transfer_custom_right_entries', JSON.stringify(customRightEntries));
    } catch (e) {
      console.error('Error saving custom right entries:', e);
    }
  }, [customRightEntries]);

  useEffect(() => {
    try {
      localStorage.setItem('transfer_is_saved', String(isSaved));
    } catch (e) {
      console.error('Error saving isSaved state:', e);
    }
  }, [isSaved]);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      setDbMissing(false);

      // 1. Fetch parties of the current user
      const { data: partiesData, error: partiesError } = await supabase
        .from('parties')
        .select(`
          id,
          party_name,
          sr_no,
          status,
          system_type,
          transactions (
            balance,
            transaction_date,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('transaction_date', { foreignTable: 'transactions', ascending: false })
        .order('created_at', { foreignTable: 'transactions', ascending: false })
        .limit(1, { foreignTable: 'transactions' });

      if (partiesError) throw partiesError;

      const mappedParties: PartyBalance[] = (partiesData || [])
        .filter(p => p.system_type === 'normal')
        .map(p => {
          const tns = p.transactions as any[];
          const bal = tns && tns.length > 0 ? Number(tns[0].balance) : 0;
          return {
            id: p.id,
            party_name: p.party_name,
            sr_no: p.sr_no,
            status: p.status as 'take' | 'give',
            system_type: p.system_type as 'normal' | 'commission' | 'escrow',
            balance: bal
          };
        });

      // Sort consistently by sr_no/name
      mappedParties.sort((a, b) => {
        const numA = parseInt(a.sr_no) || 0;
        const numB = parseInt(b.sr_no) || 0;
        return numA - numB || a.party_name.localeCompare(b.party_name);
      });

      setParties(mappedParties);

      // 2-4. Fetch transfer data, custom right entries, and sheet status in PARALLEL
      const [
        { data: transferData, error: transferError },
        { data: customRightData, error: customRightError },
        { data: statusData, error: statusError },
      ] = await Promise.all([
        supabase
          .from('transfer_entries')
          .select(`id, party_id, amount, final_amount, parties ( party_name )`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('transfer_custom_right_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('transfer_sheet_status')
          .select('is_saved')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (transferError || customRightError || statusError) {
        const err = transferError || customRightError || statusError;
        if (err && err.code === '42P01') {
          // Table doesn't exist yet, show warning banner
          setDbMissing(true);

          // Update local state leftEntries with latest party balances
          setLeftEntries(prev => {
            const updated = prev.map(entry => {
              const party = mappedParties.find(p => p.id === entry.partyId);
              if (party) {
                const currentDbAmount = -party.balance;
                const currentDbFinalAmount = Number((currentDbAmount * 0.965).toFixed(2));
                return {
                  ...entry,
                  amount: currentDbAmount,
                  finalAmount: currentDbFinalAmount
                };
              }
              return entry;
            });
            try {
              localStorage.setItem('transfer_left_entries', JSON.stringify(updated));
            } catch (e) {
              console.error(e);
            }
            return updated;
          });

          // If isSaved was true, populate right entries
          const isSavedVal = localStorage.getItem('transfer_is_saved') === 'true';
          if (isSavedVal) {
            const addedPartyIds = new Set(leftEntries.map(e => e.partyId));
            const remainingParties = mappedParties.filter(p => !addedPartyIds.has(p.id) && p.balance !== 0);
            const rightSideData: RightEntry[] = remainingParties.map(p => ({
              id: generateUUID(),
              partyId: p.id,
              partyName: p.party_name,
              balance: p.balance,
              isCustom: false
            }));
            setCustomRightEntries(prev => {
              const onlyCustom = prev.filter(e => e.isCustom);
              return [...onlyCustom, ...rightSideData];
            });
          }
        } else {
          if (transferError) throw transferError;
          if (customRightError) throw customRightError;
          if (statusError) throw statusError;
        }
      } else {
        // Load left entries using saved amounts (preserves manual edits)
        const mappedLeftEntries: LeftEntry[] = [];

        for (const t of (transferData || [])) {
          // Always use the SAVED amount from Supabase — do NOT overwrite with live party balance.
          // This preserves manually edited values across refreshes.
          const savedAmount = Number(t.amount);
          const savedFinalAmount = Number(t.final_amount);

          mappedLeftEntries.push({
            id: t.id,
            partyId: t.party_id,
            partyName: (t.parties as any)?.party_name || 'Unknown',
            amount: savedAmount,
            finalAmount: savedFinalAmount
          });
        }

        setLeftEntries(mappedLeftEntries);

        const dbPartyNames = new Set(mappedParties.map(p => p.party_name));
        const mappedCustomRight: RightEntry[] = (customRightData || []).map(t => {
          const isDbParty = dbPartyNames.has(t.party_name);
          // Always use the SAVED balance — never overwrite with live party balance.
          // This preserves manually edited values across refreshes.
          return {
            id: t.id,
            partyName: t.party_name,
            balance: Number(t.balance),
            isCustom: !isDbParty
          };
        });
        setCustomRightEntries(mappedCustomRight);

        // Sync Saved Status from Supabase
        const dbIsSaved = statusData ? statusData.is_saved : false;
        setIsSaved(dbIsSaved);
        try {
          localStorage.setItem('transfer_is_saved', String(dbIsSaved));
        } catch (e) {
          console.error(e);
        }
      }
    } catch (err) {
      console.error('Error fetching parties for transfer:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Memoized derived data — prevents recomputation on unrelated renders
  const addedPartyIds = useMemo(
    () => new Set(leftEntries.map(e => e.partyId)),
    [leftEntries]
  );

  const filteredParties = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return parties.filter(p => {
      const matchesSearch = p.party_name.toLowerCase().includes(q) ||
                            p.sr_no.toLowerCase().includes(q);
      return matchesSearch && !addedPartyIds.has(p.id) && p.balance !== 0;
    });
  }, [parties, searchQuery, addedPartyIds]);

  const firstMatch = useMemo(
    () => (searchQuery && filteredParties.length > 0 ? filteredParties[0] : null),
    [searchQuery, filteredParties]
  );

  const handleSelectParty = useCallback((party: PartyBalance) => {
    setSelectedParty(party);
    setSearchQuery(party.party_name);
    setAmountInput((-party.balance).toString());
    setIsDropdownOpen(false);
  }, []);

  // Hoisted before markUnsaved since markUnsaved calls it
  const updateDbSheetStatus = useCallback(async (savedVal: boolean) => {
    if (dbMissing || !user) return;
    try {
      await supabase
        .from('transfer_sheet_status')
        .upsert({ user_id: user.id, is_saved: savedVal, updated_at: new Date().toISOString() });

      if (!savedVal) {
        const dbPartyNames = parties.map(p => p.party_name);
        if (dbPartyNames.length > 0) {
          await supabase
            .from('transfer_custom_right_entries')
            .delete()
            .eq('user_id', user.id)
            .in('party_name', dbPartyNames);
        }
      }
    } catch (err) {
      console.error('Error updating sheet status in Supabase:', err);
    }
  }, [dbMissing, user, parties]);

  const markUnsaved = useCallback(() => {
    setIsSaved(false);
    setCustomRightEntries(prev => prev.filter(e => e.isCustom));
    updateDbSheetStatus(false);
  }, [updateDbSheetStatus]);


  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !amountInput || !user) return;

    const amt = parseFloat(amountInput);
    if (isNaN(amt)) return;

    // Calculate final amount: minus 3.5%
    const finalAmt = Number((amt * 0.965).toFixed(2));

    try {
      if (dbMissing) {
        // Fallback: local only if table doesn't exist
        const newEntry: LeftEntry = {
          id: generateUUID(),
          partyId: selectedParty.id,
          partyName: selectedParty.party_name,
          amount: amt,
          finalAmount: finalAmt
        };
        setLeftEntries(prev => [...prev, newEntry]);
        setSelectedParty(null);
        setSearchQuery('');
        setAmountInput('');
        setHighlightedIndex(0);
        markUnsaved();
        searchInputRef.current?.focus();
        return;
      }

      // Save to Supabase
      const { data, error } = await supabase
        .from('transfer_entries')
        .insert([
          {
            party_id: selectedParty.id,
            amount: amt,
            final_amount: finalAmt,
            user_id: user.id
          }
        ])
        .select(`
          id,
          party_id,
          amount,
          final_amount,
          parties (
            party_name
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        const newEntry: LeftEntry = {
          id: data.id,
          partyId: data.party_id,
          partyName: (data.parties as any)?.party_name || 'Unknown',
          amount: Number(data.amount),
          finalAmount: Number(data.final_amount)
        };

        setLeftEntries(prev => [...prev, newEntry]);
        
        // Clear Form
        setSelectedParty(null);
        setSearchQuery('');
        setAmountInput('');
        setHighlightedIndex(0);
        
        // Reset saved state since left entries changed
        markUnsaved();

        // Focus back on search input
        searchInputRef.current?.focus();
      }
    } catch (err) {
      console.error('Error inserting transfer entry:', err);
      alert('Failed to save to Supabase: ' + (err as any).message);
    }
  };

  const handleDeleteLeftEntry = useCallback(async (idx: number) => {
    const entryToDelete = leftEntries[idx];
    try {
      if (!dbMissing) {
        const { error } = await supabase
          .from('transfer_entries')
          .delete()
          .eq('id', entryToDelete.id);
        if (error) throw error;
      }
      setLeftEntries(prev => prev.filter((_, i) => i !== idx));
      markUnsaved();
    } catch (err) {
      console.error('Error deleting transfer entry:', err);
      alert('Failed to delete from Supabase: ' + (err as any).message);
    }
  }, [leftEntries, dbMissing, markUnsaved]);

  const handleEditLeftEntryClick = useCallback((idx: number) => {
    const entry = leftEntries[idx];
    setEditModalData({
      type: 'left',
      id: entry.id,
      idx: idx,
      name: entry.partyName,
      value: entry.amount
    });
    setEditModalInputValue(entry.amount.toString());
    setIsEditModalOpen(true);
  }, [leftEntries]);

  const handleEditRightEntryClick = useCallback((id: string, name: string, currentBalance: number, isCustom: boolean) => {
    setEditModalData({ type: 'right', id, name, value: currentBalance, isCustom });
    setEditModalInputValue(currentBalance.toString());
    setIsEditModalOpen(true);
  }, []);

  const handleSaveEditModal = async () => {
    if (!editModalData) return;
    const newValue = parseFloat(editModalInputValue);
    if (isNaN(newValue)) {
      alert('Invalid amount/balance');
      return;
    }

    if (editModalData.type === 'left') {
      const idx = editModalData.idx!;
      const entry = leftEntries[idx];
      const finalAmt = Number((newValue * 0.965).toFixed(2));

      try {
        if (!dbMissing) {
          const { error } = await supabase
            .from('transfer_entries')
            .update({ amount: newValue, final_amount: finalAmt })
            .eq('id', entry.id);

          if (error) throw error;
        }
        setLeftEntries(prev => prev.map((e, i) => i === idx ? { ...e, amount: newValue, finalAmount: finalAmt } : e));
        markUnsaved();
      } catch (err) {
        console.error('Error updating left entry:', err);
        alert('Failed to update in Supabase: ' + (err as any).message);
      }
    } else {
      const { id, isCustom } = editModalData;
      const dbValue = isCustom ? newValue : -newValue;

      try {
        if (!dbMissing) {
          const { error } = await supabase
            .from('transfer_custom_right_entries')
            .update({ balance: dbValue })
            .eq('id', id);

          if (error) throw error;
        }
        setCustomRightEntries(prev => prev.map(e => e.id === id ? { ...e, balance: dbValue } : e));
      } catch (err) {
        console.error('Error updating entry:', err);
        alert('Failed to update entry in Supabase: ' + (err as any).message);
      }
    }

    setIsEditModalOpen(false);
    setEditModalData(null);
  };


  const handleSaveAndPopulateRight = useCallback(async () => {
    if (!user) return;
    
    // Collect all parties of this user that are not in left entries and have non-zero balance
    const remainingParties = parties.filter(p => !addedPartyIds.has(p.id) && p.balance !== 0);

    try {
      if (dbMissing) {
        const rightSideData: RightEntry[] = remainingParties.map(p => ({
          id: generateUUID(),
          partyId: p.id,
          partyName: p.party_name,
          balance: p.balance,
          isCustom: false
        }));
        setCustomRightEntries(prev => {
          const onlyCustom = prev.filter(e => e.isCustom);
          return [...onlyCustom, ...rightSideData];
        });
        setIsSaved(true);
        return;
      }

      // First, delete any existing database entries in transfer_custom_right_entries to prevent duplicates
      const dbPartyNames = parties.map(p => p.party_name);
      if (dbPartyNames.length > 0) {
        await supabase
          .from('transfer_custom_right_entries')
          .delete()
          .eq('user_id', user.id)
          .in('party_name', dbPartyNames);
      }

      if (remainingParties.length > 0) {
        const rowsToInsert = remainingParties.map(p => ({
          party_name: p.party_name,
          balance: p.balance,
          user_id: user.id
        }));

        const { data: insertedData, error } = await supabase
          .from('transfer_custom_right_entries')
          .insert(rowsToInsert)
          .select('*');

        if (error) throw error;

        if (insertedData) {
          const mappedRightSide: RightEntry[] = insertedData.map(t => ({
            id: t.id,
            partyName: t.party_name,
            balance: Number(t.balance),
            isCustom: false
          }));
          setCustomRightEntries(prev => {
            const onlyCustom = prev.filter(e => e.isCustom);
            return [...onlyCustom, ...mappedRightSide];
          });
        }
      } else {
        setCustomRightEntries(prev => prev.filter(e => e.isCustom));
      }

      setIsSaved(true);
      await updateDbSheetStatus(true);
    } catch (err) {
      console.error('Error saving remaining parties:', err);
      alert('Failed to save remaining parties: ' + (err as any).message);
    }
  }, [user, parties, addedPartyIds, dbMissing, updateDbSheetStatus]);

  // Submit manual custom right entry
  const handleSubmitCustomRight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customRightName || !customRightBalance || !user) return;

    const bal = parseFloat(customRightBalance);
    if (isNaN(bal)) return;

    try {
      if (dbMissing) {
        const newEntry: RightEntry = {
          id: generateUUID(),
          partyName: customRightName,
          balance: bal,
          isCustom: true
        };
        setCustomRightEntries(prev => [...prev, newEntry]);
        setCustomRightName('');
        setCustomRightBalance('');
        return;
      }

      // Save to Supabase
      const { data, error } = await supabase
        .from('transfer_custom_right_entries')
        .insert([
          {
            party_name: customRightName,
            balance: bal,
            user_id: user.id
          }
        ])
        .select('*')
        .single();

      if (error) throw error;

      if (data) {
        const newEntry: RightEntry = {
          id: data.id,
          partyName: data.party_name,
          balance: Number(data.balance),
          isCustom: true
        };
        setCustomRightEntries(prev => [...prev, newEntry]);
        setCustomRightName('');
        setCustomRightBalance('');
      }
    } catch (err) {
      console.error('Error inserting custom right entry:', err);
      alert('Failed to save to Supabase: ' + (err as any).message);
    }
  };

  const handleDeleteCustomRightEntry = useCallback(async (id: string) => {
    try {
      if (!dbMissing) {
        const { error } = await supabase
          .from('transfer_custom_right_entries')
          .delete()
          .eq('id', id);
        if (error) throw error;
      }
      setCustomRightEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting custom right entry:', err);
      alert('Failed to delete custom entry from Supabase: ' + (err as any).message);
    }
  }, [dbMissing]);

  const handleReset = useCallback(async () => {
    try {
      if (!dbMissing && user) {
        await Promise.all([
          supabase.from('transfer_entries').delete().eq('user_id', user.id),
          supabase.from('transfer_custom_right_entries').delete().eq('user_id', user.id),
        ]);
      }
      setLeftEntries([]);
      setCustomRightEntries([]);
      setSelectedParty(null);
      setSearchQuery('');
      setAmountInput('');
      setCustomRightName('');
      setCustomRightBalance('');
      setIsSaved(false);
      updateDbSheetStatus(false);
      setHighlightedIndex(0);
    } catch (err) {
      console.error('Error resetting sheet:', err);
      alert('Failed to clear from Supabase: ' + (err as any).message);
    }
  }, [dbMissing, user, updateDbSheetStatus]);

  const handlePrint = useCallback(() => window.print(), []);

  // Memoized computed values — recalculated only when dependencies change
  const leftTotalFinal = useMemo(
    () => leftEntries.reduce((sum, e) => sum + e.finalAmount, 0),
    [leftEntries]
  );

  const { customPart, dbPart, displayRightEntries, rightTotalBalance } = useMemo(() => {
    const source = isSaved ? customRightEntries : customRightEntries.filter(e => e.isCustom);
    const customs = source.filter(e => e.isCustom);
    const dbs = source.filter(e => !e.isCustom).sort((a, b) => a.partyName.localeCompare(b.partyName));
    const display = [...customs, ...dbs];
    return {
      customPart: customs,
      dbPart: dbs,
      displayRightEntries: display,
      rightTotalBalance: display.reduce((sum, e) => sum + (e.isCustom ? e.balance : -e.balance), 0),
    };
  }, [customRightEntries, isSaved]);

  if (loading) return <GlobalLoader fullScreen={true} />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 transfer-entry-container">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm print:hidden transition-colors duration-200">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 transition-all active:scale-95"
            title="Go back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100 dark:shadow-none">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Transfer Entry</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">Reconciliation and Transfer Ledger tool</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={fetchData}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all active:scale-95"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Refresh Data
          </button>

          <button 
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/20 dark:hover:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200/40 dark:border-orange-900/30 rounded-xl font-bold text-xs transition-all active:scale-95"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset Sheet
          </button>

          <button 
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 dark:shadow-none rounded-xl font-bold text-xs transition-all active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>

          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-100 dark:shadow-none rounded-xl font-bold text-xs transition-all active:scale-95"
          >
            <XCircle className="w-3.5 h-3.5" />
            Exit
          </button>
        </div>
      </div>

      {/* Database missing warning banner */}
      {dbMissing && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 mb-6 text-amber-800 dark:text-amber-300 text-sm font-medium flex items-start gap-3 print:hidden animate-in fade-in duration-200">
          <Info className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900 dark:text-amber-200 uppercase text-xs tracking-wider mb-1">
              Cloud Sync Disabled (Database Tables Missing)
            </h4>
            <p className="leading-relaxed">
              One or more transfer tables (<code className="bg-amber-100/60 dark:bg-amber-950/60 px-1 py-0.5 rounded font-mono">transfer_entries</code>, <code className="bg-amber-100/60 dark:bg-amber-950/60 px-1 py-0.5 rounded font-mono">transfer_custom_right_entries</code> & <code className="bg-amber-100/60 dark:bg-amber-950/60 px-1 py-0.5 rounded font-mono">transfer_sheet_status</code>) do not exist in your Supabase database. 
              To save entries permanently in the cloud, please run the SQL scripts located in:
              <span className="block mt-1 bg-amber-100/40 dark:bg-amber-950/40 px-2 py-1 rounded font-mono text-xs max-w-max">
                1. supabase/supabase_transfer_entries.sql<br />
                2. supabase/supabase_transfer_custom_right_entries.sql<br />
                3. supabase/supabase_transfer_sheet_status.sql
              </span>
              in your Supabase SQL Editor. 
              <span className="block mt-1.5 font-bold text-amber-700 dark:text-amber-400">Currently saving entries locally in browser storage (localStorage).</span>
            </p>
          </div>
        </div>
      )}

      {/* Screen Title for Print only */}
      <div className="hidden print:flex flex-col items-center justify-center text-center pb-6 border-b-2 border-slate-800 mb-6">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Transfer Entry worksheet</h1>
        <p className="text-sm font-bold text-slate-600 mt-1">Date Generated: {new Date().toLocaleDateString('en-IN')}</p>
      </div>

      {/* Forms Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 print:hidden">
        {/* Left Form: Add Entry to Left Table */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              Add Entry to Left Table
            </h2>
            
            <form onSubmit={handleSubmitEntry} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              {/* Party Searchable Dropdown */}
              <div className="relative space-y-1.5" ref={dropdownRef}>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Select Party</label>
                <div className="relative bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:ring-4 focus-within:ring-blue-600/10 focus-within:border-blue-600 transition-all flex items-center">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400 z-10" />
                  {firstMatch && (
                    <div className="absolute inset-0 pl-11 pr-8 py-2.5 pointer-events-none flex items-center font-bold text-slate-400 dark:text-slate-500 text-sm select-none z-0">
                      <span className="text-transparent">{searchQuery}</span>
                      <span className="inline-flex items-center gap-1 bg-blue-50/95 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded px-1.5 py-0.5 text-[10px] font-black ml-1 shadow-sm shrink-0">
                        {firstMatch.party_name.slice(searchQuery.length)}
                        <kbd className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded px-0.5 text-[8px] text-blue-500 font-black">TAB</kbd>
                      </span>
                    </div>
                  )}
                  <input 
                    ref={searchInputRef}
                    placeholder="Search Party..." 
                    className="w-full pl-11 pr-8 py-2.5 bg-transparent outline-none font-bold text-sm text-slate-800 dark:text-white relative z-10"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                      setHighlightedIndex(0);
                      if (selectedParty && e.target.value !== selectedParty.party_name) {
                        setSelectedParty(null);
                        setAmountInput('');
                      }
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsDropdownOpen(false);
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setIsDropdownOpen(true);
                        setHighlightedIndex(prev => Math.min(prev + 1, filteredParties.length - 1));
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedIndex(prev => Math.max(prev - 1, 0));
                      } else if (e.key === 'Tab' || e.key === 'Enter') {
                        if (searchQuery && firstMatch) {
                          e.preventDefault();
                          handleSelectParty(firstMatch);
                        } else if (filteredParties.length > 0) {
                          e.preventDefault();
                          handleSelectParty(filteredParties[highlightedIndex]);
                        }
                      }
                    }}
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Dropdown Options List */}
                {isDropdownOpen && filteredParties.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-[180px] overflow-y-auto z-50 transition-colors">
                    {filteredParties.map((p, idx) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectParty(p)}
                        className={`px-4 py-2.5 cursor-pointer flex justify-between items-center transition-colors text-sm ${
                          idx === highlightedIndex 
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        <div>
                          <span className="font-bold">{p.party_name}</span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded ml-2 font-black uppercase">{p.sr_no}</span>
                        </div>
                        <span className={`text-xs font-extrabold ${p.balance >= 0 ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                          {p.balance < 0 ? '- ' : ''}₹ {Math.round(Math.abs(p.balance)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Balance (₹)
                </label>
                <input 
                  required
                  type="number"
                  placeholder="Fetched balance..."
                  className={`w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-black text-sm transition-all focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 ${
                    amountInput 
                      ? parseFloat(amountInput) >= 0 
                        ? 'text-emerald-600 dark:text-emerald-500' 
                        : 'text-rose-600 dark:text-rose-500' 
                      : 'text-slate-800 dark:text-white'
                  }`}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                />
              </div>

              {/* Buttons Container */}
              <div className="md:col-span-2 grid grid-cols-2 gap-3 mt-2">
                <button
                  type="submit"
                  disabled={!selectedParty || !amountInput}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-100 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed h-[42px] uppercase tracking-wider active:scale-95"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  Submit Entry
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndPopulateRight}
                  disabled={leftEntries.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 uppercase tracking-wider shadow-sm h-[42px]"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  {isSaved ? 'Saved & Synced' : 'Save & Sync'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Form: Add Custom Party */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              Add Custom Party (Non-DB)
            </h2>
            
            <form onSubmit={handleSubmitCustomRight} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Custom Party Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="Enter name..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-sm focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-slate-800 dark:text-white"
                  value={customRightName}
                  onChange={(e) => setCustomRightName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                  Balance (₹)
                </label>
                <input
                  required
                  type="number"
                  placeholder="e.g. 5000 or -5000"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-bold text-sm focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-slate-800 dark:text-white"
                  value={customRightBalance}
                  onChange={(e) => setCustomRightBalance(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="md:col-span-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all h-[42px] uppercase tracking-wider shadow-sm active:scale-95 mt-2"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Add Custom Party
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Two-Table Side-by-Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start sheet-panels-grid">
        
        {/* ================= LEFT SIDE: SELECTED ENTRIES ================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-full transition-colors duration-200 print:rounded-none print:border-slate-800">
          <div className="px-6 py-4 bg-blue-50/50 dark:bg-blue-950/20 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-800">
            <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Transfer Entries
            </h2>
            <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs font-black px-2.5 py-1 rounded-lg print:hidden">
              {leftEntries.length} Items
            </span>
          </div>

          <div className="p-6 flex-grow">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (over && active.id !== over.id) {
                  setLeftEntries(prev => {
                    const oldIdx = prev.findIndex(e => e.id === active.id);
                    const newIdx = prev.findIndex(e => e.id === over.id);
                    return arrayMove(prev, oldIdx, newIdx);
                  });
                }
              }}
            >
              <SortableContext items={leftEntries.map(e => e.id)} strategy={verticalListSortingStrategy}>
                <div className="w-full overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs font-bold border-collapse border border-[#D9D9D9] dark:border-slate-800 min-w-[500px] sm:min-w-0">
                    <thead>
                      <tr className="bg-[#F2F2F2] dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider border-b border-[#BFBFBF] dark:border-slate-700 print:border-slate-300">
                        <th className="py-2.5 px-3 border-r border-[#D9D9D9] dark:border-slate-800 w-16 text-center">SR NO.</th>
                        <th className="py-2.5 px-3 border-r border-[#D9D9D9] dark:border-slate-800">CLIENT</th>
                        <th className="py-2.5 px-3 text-right border-r border-[#D9D9D9] dark:border-slate-800">BALANCE</th>
                        <th className="py-2.5 px-3 text-right border-r border-[#D9D9D9] dark:border-slate-800">FINAL BALANCE</th>
                        <th className="py-2.5 px-3 text-center w-20 print:hidden">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D9D9D9] dark:divide-slate-800 print:divide-slate-200">
                      {leftEntries.map((entry, idx) => (
                        <LeftSortableRow
                          key={entry.id}
                          entry={entry}
                          idx={idx}
                          onEdit={handleEditLeftEntryClick}
                          onDelete={handleDeleteLeftEntry}
                        />
                      ))}
                      {leftEntries.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-16 text-center text-slate-400 dark:text-slate-500 italic bg-white dark:bg-slate-900 border-b border-[#D9D9D9] dark:border-slate-800">
                            No transfer entries added. Select a party and submit above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Left Table Total Footer */}
          <div className="px-6 py-4 bg-[#FFF2CC] dark:bg-[#3d3622]/40 border-t-2 border-b-4 border-[#BFBFBF] dark:border-slate-700 text-slate-800 dark:text-white font-black text-sm flex justify-between items-center tracking-tight">
            <span>Total Final Balance</span>
            <span className={leftTotalFinal >= 0 ? 'text-emerald-700 dark:text-emerald-400 text-base' : 'text-rose-700 dark:text-rose-400 text-base'}>
              {leftTotalFinal < 0 ? '- ' : ''}₹ {Math.round(Math.abs(leftTotalFinal)).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* ================= RIGHT SIDE: REMAINING & ADDITIONAL PARTIES ================= */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-sm overflow-hidden flex flex-col h-full transition-colors duration-200 print:rounded-none print:border-slate-800">
          <div className="px-6 py-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center print:bg-slate-100 print:border-slate-800">
            <h2 className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Remaining Parties
            </h2>
            <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-500 text-xs font-black px-2.5 py-1 rounded-lg print:hidden">
              {displayRightEntries.length} Items
            </span>
          </div>

          <div className="p-6 flex-grow">
            <div className="w-full overflow-x-auto scrollbar-thin">
              <table className="w-full text-left text-xs font-bold border-collapse border border-[#D9D9D9] dark:border-slate-800 min-w-[400px] sm:min-w-0">
                <thead>
                  <tr className="bg-[#F2F2F2] dark:bg-slate-800 text-[10px] font-black text-slate-700 dark:text-slate-400 uppercase tracking-wider border-b border-[#BFBFBF] dark:border-slate-700 print:border-slate-300">
                    <th className="py-2.5 px-3 border-r border-[#D9D9D9] dark:border-slate-800">DETAIL</th>
                    <th className="py-2.5 px-3 text-right border-r border-[#D9D9D9] dark:border-slate-800">BALANCE</th>
                    <th className="py-2.5 px-3 text-center w-20 print:hidden">ACTION</th>
                  </tr>
                </thead>

                {/* Custom entries — drag only within this group */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      setCustomRightEntries(prev => {
                        const customs = prev.filter(e => e.isCustom);
                        const dbs = prev.filter(e => !e.isCustom);
                        const oldIdx = customs.findIndex(e => e.id === active.id);
                        const newIdx = customs.findIndex(e => e.id === over.id);
                        if (oldIdx === -1 || newIdx === -1) return prev;
                        return [...arrayMove(customs, oldIdx, newIdx), ...dbs];
                      });
                    }
                  }}
                >
                  <SortableContext items={customPart.map(e => e.id!)} strategy={verticalListSortingStrategy}>
                    <tbody className="divide-y divide-[#D9D9D9] dark:divide-slate-800">
                      {customPart.map((entry, idx) => (
                        <RightSortableRow
                          key={entry.id!}
                          entry={entry}
                          idx={idx}
                          onEdit={handleEditRightEntryClick}
                          onDelete={handleDeleteCustomRightEntry}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </DndContext>

                {/* DB / Remaining Parties — drag only within this group */}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      setCustomRightEntries(prev => {
                        const customs = prev.filter(e => e.isCustom);
                        const dbs = prev.filter(e => !e.isCustom);
                        const oldIdx = dbs.findIndex(e => e.id === active.id);
                        const newIdx = dbs.findIndex(e => e.id === over.id);
                        if (oldIdx === -1 || newIdx === -1) return prev;
                        return [...customs, ...arrayMove(dbs, oldIdx, newIdx)];
                      });
                    }
                  }}
                >
                  <SortableContext items={dbPart.map(e => e.id!)} strategy={verticalListSortingStrategy}>
                    <tbody className="divide-y divide-[#D9D9D9] dark:divide-slate-800">
                      {dbPart.map((entry, idx) => (
                        <RightSortableRow
                          key={entry.id!}
                          entry={entry}
                          idx={customPart.length + idx}
                          onEdit={handleEditRightEntryClick}
                          onDelete={handleDeleteCustomRightEntry}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </DndContext>

                {/* Empty state */}
                {displayRightEntries.length === 0 && (
                  <tbody>
                    <tr>
                      <td colSpan={3} className="py-16 text-center text-slate-400 dark:text-slate-500 italic bg-white dark:bg-slate-900 border-b border-[#D9D9D9] dark:border-slate-800">
                        {isSaved
                          ? 'No remaining parties. All parties are included in the transfer list!'
                          : 'Worksheet is not saved yet. Add entries and click "Save & Sync" in the left form.'}
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          </div>


          {/* Right Table Total Footer */}
          {displayRightEntries.length > 0 && (
            <div className="px-6 py-5 bg-[#E2EFDA] dark:bg-[#20321c]/40 border-t-2 border-b-4 border-[#BFBFBF] dark:border-slate-700 text-slate-800 dark:text-white font-black text-sm flex justify-between items-center tracking-tight">
              <span>Total Balance</span>
              <span className={rightTotalBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400 text-base' : 'text-rose-700 dark:text-rose-400 text-base'}>
                {rightTotalBalance < 0 ? '- ' : ''}₹ {Math.round(Math.abs(rightTotalBalance)).toLocaleString('en-IN')}
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Combined Grand Total Section */}
      <div className="mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors duration-200 print:border-slate-850 print:rounded-none">
        {/* Excel-style FINAL TOTAL Banner */}
        <div className="flex flex-col sm:flex-row items-stretch justify-center max-w-2xl mx-auto border-2 border-slate-900 dark:border-slate-700 rounded-xl overflow-hidden font-black text-xl md:text-2xl shadow-md">
          <div className="bg-[#FF0000] text-white px-6 py-4 flex items-center justify-center tracking-wider shrink-0 uppercase select-none w-full sm:w-1/2 text-center border-b-2 sm:border-b-0 sm:border-r-2 border-slate-900 dark:border-slate-700">
            FINAL TOTAL
          </div>
          <div className="bg-[#92D050] text-slate-900 px-6 py-4 flex items-center justify-center w-full sm:w-1/2 text-center truncate font-black">
            {(leftTotalFinal + rightTotalBalance) < 0 ? '- ' : ''}₹ {Math.round(Math.abs(leftTotalFinal + rightTotalBalance)).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Small Deduction input box below the Final Total banner */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs print:hidden bg-slate-50/50 dark:bg-slate-950/20 max-w-xl mx-auto p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-slate-700 dark:text-slate-300 font-normal uppercase text-[10px] tracking-wider">Tally Amount:</span>
            <input
              type="number"
              placeholder="e.g. 10000"
              className="w-28 bg-transparent outline-none font-bold text-slate-800 dark:text-white text-xs"
              value={deductionInput}
              onChange={(e) => setDeductionInput(e.target.value)}
            />
          </div>
          <div className="font-bold text-slate-700 dark:text-slate-300">
            Difference: 
            <span className={`font-black text-sm ml-1.5 ${((leftTotalFinal + rightTotalBalance) - (parseFloat(deductionInput) || 0)) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {((leftTotalFinal + rightTotalBalance) - (parseFloat(deductionInput) || 0)) < 0 ? '- ' : ''}₹ {Math.round(Math.abs((leftTotalFinal + rightTotalBalance) - (parseFloat(deductionInput) || 0))).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Entry Modal */}
      {isEditModalOpen && editModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 transition-colors">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-wider">
                  Edit Entry
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditModalData(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                  Party Name
                </label>
                <div className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 rounded-xl font-extrabold text-sm text-slate-800 dark:text-white truncate">
                  {editModalData.name}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                  {editModalData.type === 'left' ? 'Balance / Amount (₹)' : 'Balance (₹)'}
                </label>
                <input
                  autoFocus
                  type="number"
                  placeholder="Enter value..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-black text-sm focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-slate-800 dark:text-white"
                  value={editModalInputValue}
                  onChange={(e) => setEditModalInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveEditModal();
                    }
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditModalData(null);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditModal}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-100 dark:shadow-none transition-all active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS Injector */}
      <style>{`
        @media print {
          /* Force page break behavior and clean up document styling */
          html, body {
            background-color: white !important;
            background: white !important;
            color: #0f172a !important; /* Slate 900 */
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide non-printable UI elements */
          nav, header, footer, .navbar, .navbar-container, .print\\:hidden, [class*="print:hidden"] {
            display: none !important;
          }
          
          /* Page wrapper overrides */
          #root, main, .transfer-entry-container {
            display: block !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          /* Grid layout for the side-by-side panels in print */
          .sheet-panels-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            width: 100% !important;
          }

          /* Card wrappers */
          .sheet-panels-grid > div {
            display: flex !important;
            flex-direction: column !important;
            height: auto !important;
            min-height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            border: 1px solid #BFBFBF !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            background: white !important;
            page-break-inside: auto !important;
          }

          /* Remove table padding and scroll wraps for printing */
          .p-6, .px-6, .py-4, .py-5 {
            padding: 12px !important;
            overflow: visible !important;
            height: auto !important;
          }
          
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
            height: auto !important;
            overflow: visible !important;
            table-layout: auto !important;
          }
          
          thead {
            display: table-header-group !important;
          }
          
          tr {
            page-break-inside: avoid !important;
          }
          
          th, td {
            padding: 6px 8px !important;
            border: 1px solid #BFBFBF !important;
            color: #0f172a !important;
            background-color: transparent !important;
          }

          /* Prevent text truncation in table cells for client/party names */
          td.truncate, .truncate {
            max-width: none !important;
            text-overflow: clip !important;
            white-space: normal !important;
            overflow: visible !important;
          }

          /* Force light-theme styling for dark elements in print */
          .dark, .dark * {
            background-color: transparent !important;
            color: #0f172a !important;
            border-color: #BFBFBF !important;
          }

          .bg-white, .dark\\:bg-slate-900 {
            background-color: white !important;
            background: white !important;
            color: #0f172a !important;
          }

          /* Left and Right tables header backgrounds */
          .bg-\\[\\#F2F2F2\\], .dark\\:bg-slate-800 {
            background-color: #F2F2F2 !important;
            color: #334155 !important;
          }
          
          /* Left Table Total Footer */
          .bg-\\[\\#FFF2CC\\], .dark\\:bg-\\[\\#3d3622\\]\\/40 {
            background-color: #FFF2CC !important;
            color: #0f172a !important;
          }

          /* Right Table Total Footer */
          .bg-\\[\\#E2EFDA\\], .dark\\:bg-\\[\\#20321c\\]\\/40 {
            background-color: #E2EFDA !important;
            color: #0f172a !important;
          }

          /* Grand Total Banner */
          .border-slate-900, .dark\\:border-slate-700 {
            border-color: #0f172a !important;
          }
          .bg-\\[\\#FF0000\\] {
            background-color: #FF0000 !important;
            color: white !important;
          }
          .bg-\\[\\#92D050\\] {
            background-color: #92D050 !important;
            color: #0f172a !important;
          }

          /* Row colors (Left Table) in print */
          .bg-\\[\\#FFD966\\] { background-color: #FFD966 !important; color: #0f172a !important; }
          .bg-\\[\\#47C5CB\\] { background-color: #47C5CB !important; color: #0f172a !important; }
          .bg-\\[\\#92D050\\] { background-color: #92D050 !important; color: #0f172a !important; }
          .bg-\\[\\#FF7070\\] { background-color: #FF7070 !important; color: white !important; }
          .bg-\\[\\#9DC3E6\\] { background-color: #9DC3E6 !important; color: #0f172a !important; }

          /* Row colors (Right Table) in print */
          .bg-\\[\\#E53935\\] { background-color: #E53935 !important; color: white !important; }
          .bg-\\[\\#FDD835\\] { background-color: #FDD835 !important; color: #0f172a !important; }
          .bg-\\[\\#43A047\\] { background-color: #43A047 !important; color: white !important; }
          .bg-\\[\\#1565C0\\] { background-color: #1565C0 !important; color: white !important; }
          .bg-\\[\\#B39DDB\\] { background-color: #B39DDB !important; color: #0f172a !important; }

          /* Positive/Negative text adjustments */
          .text-emerald-800, .dark\\:text-emerald-300, .text-emerald-700, .dark\\:text-emerald-400 {
            color: #065f46 !important;
          }
          .text-red-800, .dark\\:text-red-300, .text-rose-700, .dark\\:text-rose-400 {
            color: #991b1b !important;
          }

          .mt-6 {
            margin-top: 24px !important;
            page-break-inside: avoid !important;
          }
          
          .max-w-2xl {
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TransferEntry;
