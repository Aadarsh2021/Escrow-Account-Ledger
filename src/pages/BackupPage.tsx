import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
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
  LogOut,
  XCircle,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { googleDriveService, type GoogleDriveBackupFile } from '../services/googleDriveService';
import { backupRestoreService, type EscrowBackupPayload } from '../services/backupRestoreService';

const BackupPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine initial active tab based on route
  const isOnlineRoute = location.pathname.includes('online');
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>(isOnlineRoute ? 'cloud' : 'local');

  useEffect(() => {
    setActiveTab(location.pathname.includes('online') ? 'cloud' : 'local');
  }, [location.pathname]);

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

  // Initialize Drive connection on mount
  useEffect(() => {
    const isAuth = googleDriveService.isAuthenticated();
    setIsDriveConnected(isAuth);
    setConnectedEmail(googleDriveService.getConnectedEmail());
    if (isAuth) {
      fetchDriveBackups();
    }
  }, []);

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
        setErrorMsg('Failed to connect Google Drive. Please allow popups and approve the Google permission.');
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

  // 1. BACKUP TO GOOGLE DRIVE
  const handleBackupToDrive = async () => {
    if (!user) return;
    setBackingUpDrive(true);
    setDriveStatusMsg('Generating database snapshot...');
    setErrorMsg(null);

    try {
      const payload = await backupRestoreService.generateBackupData(user.id, user.email || undefined);
      
      setDriveStatusMsg('Checking & preparing "Escrow Ledger Backups" folder...');
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const fileName = `Escrow_Ledger_Backup_${dateStr}.json`;

      setDriveStatusMsg('Uploading backup to Google Drive...');
      await googleDriveService.uploadBackupFile(payload, fileName);

      setDriveStatusMsg('Backup saved successfully in your Google Drive!');
      setTimeout(() => setDriveStatusMsg(null), 4000);

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
    e.target.value = '';
  };

  // 4. RESTORE FROM GOOGLE DRIVE FILE
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

  // 5. EXECUTE RESTORE
  const handleExecuteRestore = async () => {
    if (!user || !restoreConfirmData) return;
    setRestoring(true);
    setErrorMsg(null);
    setRestoreSuccessMsg(null);

    try {
      const result = await backupRestoreService.restoreBackupData(restoreConfirmData.payload, user.id);
      setRestoreSuccessMsg(`Successfully restored ${result.partiesCount} parties and ${result.transactionsCount} transactions!`);
      setRestoreConfirmData(null);

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Backup & Online Backup
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Save your ledger records directly to Google Drive or download local offline files.
            </p>
          </div>
        </div>
        <button 
          type="button"
          onClick={() => navigate('/ledger')}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all self-start sm:self-center"
        >
          <XCircle className="w-4 h-4" />
          Back to Ledger
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl mb-8 border border-slate-200 dark:border-slate-700/60">
        <button
          onClick={() => {
            setActiveTab('cloud');
            navigate('/configure/online-backup');
          }}
          className={`flex-1 py-3 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all ${
            activeTab === 'cloud'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md shadow-slate-200/50 dark:shadow-none'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Cloud className="w-5 h-5" />
          Google Drive Online Backup
        </button>
        <button
          onClick={() => {
            setActiveTab('local');
            navigate('/configure/backup');
          }}
          className={`flex-1 py-3 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all ${
            activeTab === 'local'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-md shadow-slate-200/50 dark:shadow-none'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <HardDrive className="w-5 h-5" />
          Local Offline Backup
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {restoreSuccessMsg && (
        <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <div>
            <span className="font-bold">{restoreSuccessMsg}</span>
            <p className="text-xs opacity-80 mt-0.5">Refreshing your ledger window in a moment...</p>
          </div>
        </div>
      )}

      {/* Restore Confirmation Dialog */}
      {restoreConfirmData && (
        <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-3xl animate-in zoom-in-95 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-black text-amber-900 dark:text-amber-100">
                Confirm Database Restore
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                Backup File: <strong className="font-mono">{restoreConfirmData.fileName}</strong>
                <br />
                Records Found: <strong>{restoreConfirmData.payload.stats?.total_parties || restoreConfirmData.payload.parties?.length || 0} Parties</strong> and <strong>{restoreConfirmData.payload.stats?.total_transactions || restoreConfirmData.payload.transactions?.length || 0} Transactions</strong>.
              </p>
              <div className="p-3 bg-amber-100/70 dark:bg-amber-900/30 rounded-xl my-3 text-xs text-amber-900 dark:text-amber-200 font-medium">
                ⚠️ Restoring will merge and update existing party balances and transaction records with the contents of this backup.
              </div>

              <div className="flex items-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={restoring}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {restoring ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm & Restore Now
                </button>
                <button
                  type="button"
                  onClick={() => setRestoreConfirmData(null)}
                  disabled={restoring}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Google Drive Online Backup */}
      {activeTab === 'cloud' && (
        <div className="space-y-6">
          {/* Connection Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors duration-200">
            {!isDriveConnected ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 rounded-full text-blue-700 dark:text-blue-300 text-xs font-bold">
                    <Cloud className="w-3.5 h-3.5" />
                    Personal Google Drive Integration
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Connect Your Google Account
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    Connect your personal Google Drive to save automated backups into a dedicated, secure folder named <strong className="text-slate-700 dark:text-slate-200">"Escrow Ledger Backups"</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConnectDrive}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm flex items-center gap-2.5 shadow-lg shadow-blue-600/25 transition-all active:scale-95 shrink-0"
                >
                  <Cloud className="w-5 h-5" />
                  Connect Google Drive
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center font-bold">
                      <FolderCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {connectedEmail || 'Google Drive Connected'}
                        </span>
                        <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[11px] font-black rounded-full">
                          ACTIVE
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Target Folder: <strong className="text-slate-700 dark:text-slate-300">Google Drive &gt; Escrow Ledger Backups</strong> (Auto-detected)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={fetchDriveBackups}
                      disabled={loadingDriveList}
                      className="p-2.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                      title="Refresh files"
                    >
                      <RefreshCcw className={`w-4 h-4 ${loadingDriveList ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectDrive}
                      className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  </div>
                </div>

                {/* Backup Now Action Box */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Save New Cloud Backup
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Packages all parties, transactions, and balances directly into "Escrow Ledger Backups" folder.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackupToDrive}
                    disabled={backingUpDrive}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {backingUpDrive ? (
                      <>
                        <RefreshCcw className="w-4 h-4 animate-spin" />
                        <span>Saving to Drive...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Backup to Google Drive</span>
                      </>
                    )}
                  </button>
                </div>

                {driveStatusMsg && (
                  <div className="p-3 bg-blue-100/70 dark:bg-blue-900/40 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2 font-medium">
                    <RefreshCcw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    <span>{driveStatusMsg}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drive Backups List */}
          {isDriveConnected && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-colors duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Backups in "Escrow Ledger Backups" Folder
                </h3>
                <span className="text-xs text-slate-400 font-bold">
                  {driveBackups.length} file{driveBackups.length === 1 ? '' : 's'}
                </span>
              </div>

              {loadingDriveList ? (
                <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
                  <RefreshCcw className="w-6 h-6 animate-spin text-blue-600" />
                  <span>Loading backups from Google Drive...</span>
                </div>
              ) : driveBackups.length === 0 ? (
                <div className="py-10 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-6">
                  <FileJson className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                    No backups found in Google Drive
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Click "Backup to Google Drive" above to create your first cloud backup.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {driveBackups.map((file) => (
                    <div key={file.id} className="py-3.5 flex items-center justify-between gap-4 group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <FileJson className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(file.createdTime).toLocaleString()}
                            </span>
                            {file.size && (
                              <span>{(Number(file.size) / 1024).toFixed(1)} KB</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectDriveFileForRestore(file)}
                        disabled={restoring}
                        className="px-4 py-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold transition shadow-sm shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Local Offline Backup */}
      {activeTab === 'local' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Download Backup */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Download Offline Backup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Creates a standalone JSON file containing all parties, transactions, commission rates, and profile details for offline archival on your device.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadLocal}
              disabled={downloadingLocal}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {downloadingLocal ? (
                <>
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                  <span>Preparing JSON...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Backup (.json)</span>
                </>
              )}
            </button>
          </div>

          {/* Card 2: Restore from Local File */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Restore from Local File
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Select a previously exported <code className="text-amber-600 dark:text-amber-400 font-mono">.json</code> backup file from your computer to restore your ledger data.
              </p>
            </div>

            <label className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 text-center">
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Choose Backup File (.json)</span>
              <input
                type="file"
                accept=".json,application/json"
                onChange={handleSelectLocalFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupPage;
