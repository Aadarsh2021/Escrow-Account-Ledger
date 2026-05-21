import React, { useRef, useEffect } from 'react';
import { X, ArrowRightLeft, ChevronDown, Plus, Save } from 'lucide-react';

interface Party {
  id: string;
  party_name: string;
  sr_no: string;
  status: 'take' | 'give';
  commission_rate: number;
  monday_final: boolean;
  system_type: 'normal' | 'commission' | 'company';
}

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editFormData: {
    remarks: string;
    amount: string;
    linkedParty: Party | null;
    linkedSearch: string;
  };
  setEditFormData: React.Dispatch<React.SetStateAction<{
    remarks: string;
    amount: string;
    linkedParty: Party | null;
    linkedSearch: string;
  }>>;
  isEditLinkedSearchOpen: boolean;
  setIsEditLinkedSearchOpen: (open: boolean) => void;
  editHighlightedIndex: number;
  setEditHighlightedIndex: React.Dispatch<React.SetStateAction<number>>;
  filteredEditLinkedParties: Party[];
  firstEditLinkedMatch: Party | null;
  selectEditLinkedParty: (party: Party) => void;
  onSave: () => void;
  submitting: boolean;
}

export const EditTransactionModal = ({
  isOpen,
  onClose,
  editFormData,
  setEditFormData,
  isEditLinkedSearchOpen,
  setIsEditLinkedSearchOpen,
  editHighlightedIndex,
  setEditHighlightedIndex,
  filteredEditLinkedParties,
  firstEditLinkedMatch,
  selectEditLinkedParty,
  onSave,
  submitting
}: EditTransactionModalProps) => {
  const editLinkedSearchRef = useRef<HTMLInputElement>(null);
  const editDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editDropdownRef.current && !editDropdownRef.current.contains(event.target as Node)) {
        setIsEditLinkedSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsEditLinkedSearchOpen]);

  if (!isOpen) return null;

  const getEditAmountColorClass = () => {
    if (!editFormData.amount) return 'text-blue-600';
    const val = parseFloat(editFormData.amount);
    if (isNaN(val) || val === 0) return 'text-blue-600';
    return val > 0 ? 'text-emerald-600' : 'text-rose-600';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Modify Entry</h3>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500 transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="space-y-1.5 relative" ref={editDropdownRef}>
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Transfer To</label>
            <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus-within:ring-4 focus-within:ring-blue-600/10 focus-within:border-blue-600 transition-all flex items-center">
              <ArrowRightLeft className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-455 z-10" />
              {firstEditLinkedMatch && (
                <div className="absolute inset-0 pl-11 pr-8 py-3 pointer-events-none flex items-center font-bold text-slate-800 dark:text-slate-300 select-none z-0">
                  <span className="text-transparent">{editFormData.linkedSearch}</span>
                  <span className="inline-flex items-center gap-1.5 bg-blue-50/95 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 rounded-lg px-2 py-0.5 text-xs font-black ml-1 shadow-sm shrink-0 animate-in fade-in-50 zoom-in-95 duration-150">
                    {firstEditLinkedMatch.party_name.slice(editFormData.linkedSearch.length)}
                    <kbd className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded px-1 text-[9px] text-blue-500 font-black shadow-xs">TAB</kbd>
                  </span>
                </div>
              )}
              <input 
                ref={editLinkedSearchRef} 
                placeholder="Search Party..." 
                className="w-full pl-11 pr-8 py-3 bg-transparent outline-none font-bold text-slate-888 dark:text-white relative z-10" 
                value={editFormData.linkedSearch} 
                onChange={(e) => { 
                  setEditFormData(prev => ({ ...prev, linkedSearch: e.target.value })); 
                  setIsEditLinkedSearchOpen(true); 
                  setEditHighlightedIndex(0); 
                }} 
                onClick={() => setIsEditLinkedSearchOpen(true)} 
                onKeyDown={(e) => { 
                  if ((e.key === 'Enter' || e.key === 'Tab') && firstEditLinkedMatch) {
                    e.preventDefault();
                    selectEditLinkedParty(firstEditLinkedMatch);
                  } else if (e.key === 'ArrowDown') { 
                    setIsEditLinkedSearchOpen(true); 
                    setEditHighlightedIndex(p => Math.min(p + 1, filteredEditLinkedParties.length - 1)); 
                  } else if (e.key === 'ArrowUp') {
                    setEditHighlightedIndex(p => Math.max(p - 1, 0)); 
                  } else if (e.key === 'Enter' && filteredEditLinkedParties.length > 0) { 
                    e.preventDefault(); 
                    selectEditLinkedParty(filteredEditLinkedParties[editHighlightedIndex]); 
                  } 
                }} 
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-655 z-10 pointer-events-none" />
              {isEditLinkedSearchOpen && filteredEditLinkedParties.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-40 overflow-y-auto z-50">
                  {filteredEditLinkedParties.map((p, i) => (
                    <div 
                      key={p.id} 
                      onClick={() => selectEditLinkedParty(p)} 
                      className={`px-5 py-3 cursor-pointer flex justify-between items-center ${i === editHighlightedIndex ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                    >
                      <span className="font-bold">{p.party_name}</span>
                      <span className="text-[10px] font-black opacity-40 dark:opacity-60 uppercase">{p.sr_no}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Amount (₹)</label>
            <input 
              required 
              type="number" 
              step="0.01" 
              placeholder="3000 (CR) or -3000 (DR)" 
              className={`w-full px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none font-black text-xl transition-colors ${getEditAmountColorClass()}`} 
              value={editFormData.amount} 
              onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))} 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Narration / Remarks</label>
            <div className="relative">
              <Plus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input 
                placeholder="Enter details..." 
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 outline-none font-medium text-slate-800 dark:text-white rounded-xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600" 
                value={editFormData.remarks} 
                onChange={(e) => setEditFormData(prev => ({ ...prev, remarks: e.target.value }))} 
              />
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={onClose} 
              className="flex-grow py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={onSave} 
              disabled={submitting || !editFormData.amount || parseFloat(editFormData.amount) === 0 || !editFormData.linkedParty} 
              className="flex-grow py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
