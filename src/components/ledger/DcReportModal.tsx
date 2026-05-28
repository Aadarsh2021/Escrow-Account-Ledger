import { X, RefreshCcw, FileText } from 'lucide-react';
import { CustomDatePicker } from '../ui/CustomDatePicker';

interface DcReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dcFromDate: string;
  setDcFromDate: (val: string) => void;
  dcToDate: string;
  setDcToDate: (val: string) => void;
  fetchDcReport: () => void;
  isDcLoading: boolean;
  dcReportData: { credit: number; debit: number; balance: number } | null;
  setDcReportData: React.Dispatch<React.SetStateAction<{ credit: number; debit: number; balance: number } | null>>;
}

export const DcReportModal = ({
  isOpen,
  onClose,
  dcFromDate,
  setDcFromDate,
  dcToDate,
  setDcToDate,
  fetchDcReport,
  isDcLoading,
  dcReportData,
  setDcReportData
}: DcReportModalProps) => {
  if (!isOpen) return null;

  const getAmountClass = (val: number) => {
    const formatted = Math.round(val).toLocaleString();
    if (formatted.length > 14) return 'text-[9px] sm:text-[10px] md:text-[11px]';
    if (formatted.length > 10) return 'text-[11px] sm:text-xs md:text-sm';
    return 'text-xs sm:text-sm md:text-base';
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-visible animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6">
          {dcReportData ? 'DC Report' : 'Generate DC Report'}
        </h3>
        
        {!dcReportData ? (
          <div className="space-y-4">
            <CustomDatePicker 
              label="From Date" 
              value={dcFromDate} 
              onChange={setDcFromDate} 
            />
            <CustomDatePicker 
              label="To Date" 
              value={dcToDate} 
              onChange={setDcToDate} 
              align="top"
            />
            <button 
              onClick={fetchDcReport}
              disabled={!dcFromDate || !dcToDate || isDcLoading}
              className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isDcLoading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
              Generate Report
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 py-3 px-4 rounded-xl border border-slate-100 dark:border-slate-800 text-center">
              Period: <span className="text-slate-800 dark:text-slate-200 font-black">{dcFromDate}</span> to <span className="text-slate-800 dark:text-slate-200 font-black">{dcToDate}</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-4 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 relative text-center divide-x divide-slate-200 dark:divide-slate-800">
              {isDcLoading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-3xl flex items-center justify-center z-10">
                  <RefreshCcw className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              )}
              
              <div className="flex flex-col items-center justify-center px-1">
                <span className="text-[9px] sm:text-[10px] font-black text-emerald-600/70 uppercase tracking-wider mb-1">Total Credit</span>
                <span className={`font-black text-emerald-600 break-all ${getAmountClass(dcReportData?.credit || 0)}`}>
                  ₹{Math.round(dcReportData?.credit || 0).toLocaleString()}
                </span>
              </div>
              
              <div className="flex flex-col items-center justify-center px-1">
                <span className="text-[9px] sm:text-[10px] font-black text-rose-600/70 uppercase tracking-wider mb-1">Total Debit</span>
                <span className={`font-black text-rose-600 break-all ${getAmountClass(dcReportData?.debit || 0)}`}>
                  ₹{Math.round(dcReportData?.debit || 0).toLocaleString()}
                </span>
              </div>
              
              <div className="flex flex-col items-center justify-center px-1">
                <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Net Balance</span>
                <span className={`font-black flex flex-wrap items-baseline justify-center gap-0.5 ${(dcReportData?.balance || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'} ${getAmountClass(Math.abs(dcReportData?.balance || 0))}`}>
                  <span className="break-all">₹{Math.round(Math.abs(dcReportData?.balance || 0)).toLocaleString()}</span>
                  <span className="text-[9px] sm:text-xs font-bold opacity-80">{(dcReportData?.balance || 0) >= 0 ? '(CR)' : '(DR)'}</span>
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setDcReportData(null)}
                className="flex-1 py-4 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
              >
                Change Dates
              </button>
              <button 
                onClick={onClose}
                className="flex-1 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:opacity-90 transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
