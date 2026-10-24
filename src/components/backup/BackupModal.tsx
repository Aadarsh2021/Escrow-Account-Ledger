import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  Download, 
  Upload, 
  HardDrive, 
  RefreshCcw, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  FileJson, 
  Database,
  ShieldCheck,
  Check,
  FolderCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { googleDriveService, type GoogleDriveBackupFile } from '../../services/googleDriveService';
import { backupRestoreService, type EscrowBackupPayload } from '../../services/backupRestoreService';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'cloud' | 'local';
  onRestoreCompleted?: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ 
  isOpen, 
  onClose, 
  initialTab = 'cloud',
  onRestoreCompleted 
}) => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Google Drive state
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [driveBackups, setDriveBackups] = useState<GoogleDriveBackupFile[]>([]);
  const [loadingDriveList, setLoadingDriveList] = useState(false);
  const [backingUpDrive, setBackingUpDrive] = useState(false);
  const [driveStatusMsg, setDriveStatusMsg] = useState<string | null>(null);

  // Local backup state
  const [downloadingLocal, setDownloadingLocal] = useState(false);
  
  // Restore flow state
  const [restoring, setRestoring] = useState(false);
  const [restoreConfirmData, setRestoreConfirmData] = useState<{
    source: 'cloud' | 'local';
    fileName: string;
    payload: EscrowBackupPayload;
  } | null>(null);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check drive authentication on open
  useEffect(() => {
    if (isOpen) {
      const isAuth = googleDriveService.isAuthenticated();
      setIsDriveConnected(isAuth);
      setConnectedEmail(googleDriveService.getConnectedEmail());
      setErrorMsg(null);
      setRestoreSuccessMsg(null);

      if (isAuth) {
        fetchDriveBackups();
      }
    }
  }, [isOpen]);

  const fetchDriveBackups = async () => {
    setLoadingDriveList(true);
    try {
      const files = await googleDriveService.listBackups();
      setDriveBackups(files);
    } catch (err: any) {
      console.warn('Error loading drive backups:', err);
    } finally {
      setLoadingDriveList(false);
    }
  };

  const handleConnectDrive = async () => {
    setErrorMsg(null);
    try {
      const ok = await googleDriveService.authenticate();
      if (ok) {
        setIsDriveConnected(true);
        setConnectedEmail(googleDriveService.getConnectedEmail());
        fetchDriveBackups();
      } else {
        setErrorMsg('Failed to connect Google Drive. Please allow popup and permissions.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to Google Drive');
    }
  };

  const handleDisconnectDrive = () => {
    googleDriveService.disconnect();
    setIsDriveConnected(false);
    setConnectedEmail(null);
    setDriveBackups([]);
  };

  // 1. BACKUP TO GOOGLE DRIVE (Checks/Creates 'Escrow Ledger Backups' folder and saves)
  const handleBackupToDrive = async () => {
    if (!user) return;
    setBackingUpDrive(true);
    setDriveStatusMsg('Generating database snapshot...');
    setErrorMsg(null);

    try {
      // Step A: Generate backup data
      const payload = await backupRestoreService.generateBackupData(user.id, user.email || undefined);
      
      setDriveStatusMsg('Checking & creating Google Drive folder...');
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const fileName = `Escrow_Ledger_Backup_${dateStr}.json`;

      // Step B: Upload into "Escrow Ledger Backups" folder
      setDriveStatusMsg('Saving backup into "Escrow Ledger Backups" folder...');
      await googleDriveService.uploadBackupFile(payload, fileName);

      setDriveStatusMsg('Backup saved successfully in your Google Drive!');
      setTimeout(() => setDriveStatusMsg(null), 4000);

      // Refresh backup list
      fetchDriveBackups();
    } catch (err: any) {
      console.error('Drive backup failed:', err);
      setErrorMsg(err.message || 'Google Drive backup failed');
      setDriveStatusMsg(null);
    } finally {
      setBackingUpDrive(false);
    }
  };

  // 2. DOWNLOAD LOCAL BACKUP FILE
  const handleDownloadLocal = async () => {
    if (!user) return;
    setDownloadingLocal(true);
    setErrorMsg(null);
    try {
      const payload = await backupRestoreService.generateBackupData(user.id, user.email || undefined);
      backupRestoreService.downloadLocalBackup(payload);
    } catch (err: any) {
      setErrorMsg(err.message || 'Local backup failed');
    } finally {
      setDownloadingLocal(false);
    }
  };

  // 3. SELECT LOCAL FILE FOR RESTORE
  const handleSelectLocalFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);
        if (!json.parties || !json.transactions) {
          throw new Error('Selected file is not a valid Escrow Ledger backup.');
        }
        setRestoreConfirmData({
          source: 'local',
          fileName: file.name,
          payload: json
        });
      } catch (err: any) {
        setErrorMsg('Invalid JSON backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset
  };

  // 4. INITIATE RESTORE FROM GOOGLE DRIVE FILE
  const handleSelectDriveFileForRestore = async (file: GoogleDriveBackupFile) => {
    setRestoring(true);
    setErrorMsg(null);
    try {
      const payload = await googleDriveService.downloadBackupContent(file.id);
      if (!payload.parties || !payload.transactions) {
        throw new Error('Selected Google Drive file is not a valid backup.');
      }
      setRestoreConfirmData({
        source: 'cloud',
        fileName: file.name,
        payload
      });
    } catch (err: any) {
      setErrorMsg('Failed to load backup from Drive: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  // 5. CONFIRM AND EXECUTE RESTORE
  const handleExecuteRestore = async () => {
    if (!user || !restoreConfirmData) return;
    setRestoring(true);
    setErrorMsg(null);
    setRestoreSuccessMsg(null);

    try {
      const result = await backupRestoreService.restoreBackupData(restoreConfirmData.payload, user.id);
      setRestoreSuccessMsg(`Successfully restored ${result.partiesCount} parties and ${result.transactionsCount} transactions!`);
      setRestoreConfirmData(null);

      if (onRestoreCompleted) {
        onRestoreCompleted();
      }

      // Auto-reload after 2 seconds to refresh all views cleanly
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error('Restore error:', err);
      setErrorMsg('Restore failed: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 z-10 max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Backup & Restore
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure your ledger data in Google Drive or download offline backup
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selectors */}
        <div className="flex items-center gap-2 pt-4 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'cloud'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Cloud className="w-4 h-4" />
            Google Drive Backup
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('local')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'local'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            Local Offline Backup
          </button>
        </div>

        {/* Messages / Alerts */}
        {errorMsg && (
          <div className="my-2 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {restoreSuccessMsg && (
          <div className="my-2 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <div className="flex-1">
              <span className="font-bold">{restoreSuccessMsg}</span>
              <p className="text-[11px] opacity-80 mt-0.5">Refreshing your ledger window...</p>
            </div>
          </div>
        )}

        {/* Restore Confirmation Dialog (Modal within modal) */}
        {restoreConfirmData && (
          <div className="my-3 p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 rounded-2xl animate-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                  Confirm Database Restore
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                  Backup File: <strong>{restoreConfirmData.fileName}</strong>
                  <br />
                  Contains: <strong>{restoreConfirmData.payload.stats?.total_parties || restoreConfirmData.payload.parties?.length || 0} Parties</strong> and <strong>{restoreConfirmData.payload.stats?.total_transactions || restoreConfirmData.payload.transactions?.length || 0} Transactions</strong>.
                  <br />
                  <span className="text-rose-600 dark:text-rose-400 font-bold mt-1 inline-block">
                    ⚠️ Restoring will update and merge existing party & transaction records with this backup.
                  </span>
                </p>

                <div className="flex items-center gap-3 mt-3">
                  <button
                    type="button"
                    onClick={handleExecuteRestore}
                    disabled={restoring}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {restoring ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    {restoring ? 'Restoring Data...' : 'Yes, Restore Now'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestoreConfirmData(null)}
                    disabled={restoring}
                    className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-5 pr-1 custom-scrollbar">

          {/* TAB 1: GOOGLE DRIVE CLOUD BACKUP */}
          {activeTab === 'cloud' && (
            <div className="space-y-4">
              
              {/* Google Drive Account Card */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                    {/* Official Google Drive icon colors */}
                    <svg className="w-5 h-5" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.9 2.5 3.2 3.3l12.3-21.3H6.6c0 1.5.4 3 1.2 4.35z" fill="#0066da"/>
                      <path d="M43.65 25 29.35 0H14.7c-1.4 0-2.8.4-4.1 1.15L0 19.55l14.7 25.4 14.65-25.4z" fill="#00ac47"/>
                      <path d="M73.55 76.8c1.3-.8 2.4-1.9 3.2-3.3l7.95-13.8c.8-1.4 1.2-2.9 1.2-4.45H57.7l15.85 21.55z" fill="#ea4335"/>
                      <path d="M43.65 25 58.35 0h-14.7c-1.4 0-2.8.4-4.1 1.15l-10.2 17.7 14.3 25.4z" fill="#00832d"/>
                      <path d="M58.35 50.25 43.65 25l-14.3 25.25H6.6l19.35 33.55c1.4.8 2.9 1.2 4.45 1.2h26.5c1.55 0 3.05-.4 4.45-1.2l-3-5.3z" fill="#2684fc"/>
                      <path d="m84.7 55.25-14.7-25.5-12.3 21.3 12.3 21.3h14.7c0-1.5-.4-3-1.2-4.35z" fill="#ffba00"/>
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      Google Drive Cloud Storage
                      {isDriveConnected && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-black px-2 py-0.5 rounded-full">
                          Connected
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isDriveConnected 
                        ? (connectedEmail ? `Connected as: ${connectedEmail}` : 'Connected to your Google Drive') 
                        : 'Connect your Google Drive to save backups directly in your account'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {isDriveConnected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectDrive}
                      className="px-3.5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectDrive}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                    >
                      Connect Google Drive
                    </button>
                  )}
                </div>
              </div>

              {/* Action Banner: Backup Now */}
              {isDriveConnected ? (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-5 rounded-2xl border border-blue-200 dark:border-blue-900/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold text-sm">
                        <FolderCheck className="w-4 h-4 text-blue-600" />
                        Target Folder: <span className="underline font-black">Escrow Ledger Backups</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        If the folder does not exist in your Drive, it will be created automatically.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleBackupToDrive}
                      disabled={backingUpDrive}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      {backingUpDrive ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                      {backingUpDrive ? 'Saving Backup...' : 'Backup to Google Drive'}
                    </button>
                  </div>

                  {driveStatusMsg && (
                    <div className="mt-3 text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-2 animate-in fade-in">
                      <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>{driveStatusMsg}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-center py-6 text-slate-500">
                  <Cloud className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-60" />
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Connect your Google account above to enable automatic Google Drive backups.
                  </p>
                </div>
              )}

              {/* History of Backups in Google Drive */}
              {isDriveConnected && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Backups in "Escrow Ledger Backups" folder ({driveBackups.length})
                    </span>
                    <button
                      type="button"
                      onClick={fetchDriveBackups}
                      disabled={loadingDriveList}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCcw className={`w-3 h-3 ${loadingDriveList ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  </div>

                  {loadingDriveList ? (
                    <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                      <RefreshCcw className="w-5 h-5 animate-spin text-blue-600" />
                      <span>Loading backups from Google Drive...</span>
                    </div>
                  ) : driveBackups.length === 0 ? (
                    <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400">
                      No backup files found yet. Click "Backup to Google Drive" above to create your first backup.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                      {driveBackups.map((b) => (
                        <div
                          key={b.id}
                          className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-blue-300 dark:hover:border-blue-900/60 transition-all shadow-xs"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileJson className="w-5 h-5 text-blue-500 shrink-0" />
                            <div className="overflow-hidden">
                              <h5 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                {b.name}
                              </h5>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {b.createdTime ? new Date(b.createdTime).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                                {b.size ? ` • ${Math.round(parseInt(b.size) / 1024)} KB` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSelectDriveFileForRestore(b)}
                              disabled={restoring}
                              className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <Upload className="w-3 h-3" />
                              Restore
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOCAL OFFLINE BACKUP */}
          {activeTab === 'local' && (
            <div className="space-y-4">
              
              {/* Download Local Backup Card */}
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                        Download Full Backup File (.json)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Download an offline copy of your entire ledger, parties, and entries to your device.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadLocal}
                    disabled={downloadingLocal}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {downloadingLocal ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {downloadingLocal ? 'Preparing File...' : 'Download File'}
                  </button>
                </div>
              </div>

              {/* Restore from Local File Card */}
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                      Restore from Local Backup File
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Select a previously downloaded <code className="font-mono text-blue-600">.json</code> file to restore your ledger.
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-slate-900 transition-all group">
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors mb-2" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Click to choose or drag & drop backup file (.json)
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      File format: Escrow_Ledger_Backup_*.json
                    </span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleSelectLocalFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Encrypted & secure storage</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
