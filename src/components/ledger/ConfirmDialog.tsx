import { Trash2, CheckCircle2, Edit2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  type,
  onConfirm,
  onCancel
}: ConfirmDialogProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200" 
        onClick={onCancel} 
      />
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-8 text-center">
        <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 ${
          type === 'danger' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-450' : 
          type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450' : 
          'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
        }`}>
          {type === 'danger' ? <Trash2 className="w-10 h-10" /> : 
           type === 'success' ? <CheckCircle2 className="w-10 h-10" /> : 
           <Edit2 className="w-10 h-10" />}
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">{message}</p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 ${
              type === 'danger' ? 'bg-rose-600 shadow-rose-200 dark:shadow-none hover:bg-rose-700' : 
              type === 'success' ? 'bg-emerald-600 shadow-emerald-200 dark:shadow-none hover:bg-emerald-700' : 
              'bg-blue-600 shadow-blue-200 dark:shadow-none hover:bg-blue-700'
            }`}
          >
            Confirm Action
          </button>
          <button 
            onClick={onCancel}
            className="w-full py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
