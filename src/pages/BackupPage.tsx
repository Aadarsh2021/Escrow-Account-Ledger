import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BackupModal } from '../components/backup/BackupModal';
import { HardDrive, Cloud, Download, ArrowLeft } from 'lucide-react';

const BackupPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = React.useState(true);

  const isOnline = location.pathname.includes('online');
  const initialTab: 'cloud' | 'local' = isOnline ? 'cloud' : 'local';

  const handleClose = () => {
    setModalOpen(false);
    navigate(-1);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-lg space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
          {isOnline ? <Cloud className="w-8 h-8" /> : <HardDrive className="w-8 h-8" />}
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {isOnline ? 'Google Drive Online Backup' : 'Local Offline Backup'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isOnline 
            ? 'Save your ledger data directly to your personal Google Drive in the "Escrow Ledger Backups" folder.'
            : 'Download a standalone JSON backup file of all your parties, transactions, and balances to your computer.'}
        </p>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            {isOnline ? <Cloud className="w-4 h-4" /> : <Download className="w-4 h-4" />}
            Open Backup Center
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-2 px-4 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition flex items-center justify-center gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>

      <BackupModal
        isOpen={modalOpen}
        onClose={handleClose}
        initialTab={initialTab}
        onRestoreCompleted={() => {
          navigate('/ledger');
        }}
      />
    </div>
  );
};

export default BackupPage;
