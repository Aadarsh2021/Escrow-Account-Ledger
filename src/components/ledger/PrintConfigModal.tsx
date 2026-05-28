import { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { CustomDatePicker } from '../ui/CustomDatePicker';

interface PrintConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (filterType: 'all' | 'date', startDate: string, endDate: string) => void;
}

export const PrintConfigModal = ({
  isOpen,
  onClose,
  onConfirm
}: PrintConfigModalProps) => {
  const [filterType, setFilterType] = useState<'all' | 'date'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const handlePrintSubmit = () => {
    if (filterType === 'date' && (!startDate || !endDate)) {
      alert('Please select both start and end dates.');
      return;
    }
    onConfirm(filterType, startDate, endDate);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-visible animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
            <Printer className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Print Ledger Statement
          </h3>
        </div>

        <div className="space-y-6">
          {/* Print Filter Toggle Tabs */}
          <div className="bg-slate-100 dark:bg-slate-950 p-1 rounded-xl flex gap-1 border border-slate-200/50 dark:border-slate-800/50">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All History
            </button>
            <button
              onClick={() => setFilterType('date')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                filterType === 'date'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/20'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              By Date Range
            </button>
          </div>

          {/* Conditional Date Pickers */}
          {filterType === 'date' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <CustomDatePicker 
                label="Start Date" 
                value={startDate} 
                onChange={setStartDate} 
              />
              <CustomDatePicker 
                label="End Date" 
                value={endDate} 
                onChange={setEndDate} 
                align="top"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button 
              onClick={onClose}
              className="flex-1 py-3.5 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 text-sm"
            >
              Cancel
            </button>
            <button 
              onClick={handlePrintSubmit}
              disabled={filterType === 'date' && (!startDate || !endDate)}
              className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white font-black rounded-xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-200 dark:shadow-none"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
