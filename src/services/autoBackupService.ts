import { googleDriveService } from './googleDriveService';
import { backupRestoreService } from './backupRestoreService';
import { toast } from 'react-hot-toast';

export interface AutoBackupConfig {
  enabled: boolean;
  intervalDays: number;
  lastDriveBackupAt: string | null;
  lastLocalBackupAt: string | null;
}

const DEFAULT_INTERVAL_DAYS = 15;
const STORAGE_KEY_PREFIX = 'escrow_drive_autobackup_';

class AutoBackupService {
  private getStorageKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }

  getConfig(userId: string): AutoBackupConfig {
    if (typeof window === 'undefined') {
      return {
        enabled: true,
        intervalDays: DEFAULT_INTERVAL_DAYS,
        lastDriveBackupAt: null,
        lastLocalBackupAt: null
      };
    }

    try {
      const raw = localStorage.getItem(this.getStorageKey(userId));
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading auto backup config:', e);
    }

    return {
      enabled: true,
      intervalDays: DEFAULT_INTERVAL_DAYS,
      lastDriveBackupAt: null,
      lastLocalBackupAt: null
    };
  }

  saveConfig(userId: string, config: Partial<AutoBackupConfig>): AutoBackupConfig {
    const current = this.getConfig(userId);
    const updated: AutoBackupConfig = {
      ...current,
      ...config
    };
    try {
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('escrow_auto_backup_change', { detail: updated }));
    } catch (e) {
      console.warn('Error saving auto backup config:', e);
    }
    return updated;
  }

  recordDriveBackupTaken(userId: string): void {
    const nowIso = new Date().toISOString();
    this.saveConfig(userId, {
      lastDriveBackupAt: nowIso
    });
  }

  recordLocalBackupTaken(userId: string): void {
    const nowIso = new Date().toISOString();
    this.saveConfig(userId, {
      lastLocalBackupAt: nowIso
    });
  }

  isBackupDue(userId: string): boolean {
    // Only due if user has connected their Google Drive
    if (!googleDriveService.isAuthenticated()) {
      return false;
    }

    const config = this.getConfig(userId);
    if (!config.enabled) return false;

    // If connected but never backed up yet
    if (!config.lastDriveBackupAt) {
      return true;
    }

    const lastTime = new Date(config.lastDriveBackupAt).getTime();
    if (isNaN(lastTime)) return true;

    const intervalMs = (config.intervalDays || DEFAULT_INTERVAL_DAYS) * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - lastTime;

    return elapsed >= intervalMs;
  }

  getNextBackupDate(userId: string): Date | null {
    if (!googleDriveService.isAuthenticated()) return null;

    const config = this.getConfig(userId);
    if (!config.lastDriveBackupAt) return null;

    const lastTime = new Date(config.lastDriveBackupAt).getTime();
    if (isNaN(lastTime)) return null;

    const intervalMs = (config.intervalDays || DEFAULT_INTERVAL_DAYS) * 24 * 60 * 60 * 1000;
    return new Date(lastTime + intervalMs);
  }

  getDaysRemaining(userId: string): number {
    const nextDate = this.getNextBackupDate(userId);
    if (!nextDate) return 0;

    const diffMs = nextDate.getTime() - Date.now();
    if (diffMs <= 0) return 0;

    return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Never taken yet';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Never taken yet';
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  }

  formatRelativeTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  }

  async runAutomaticBackup(userId: string, userEmail?: string): Promise<{ success: boolean; mode: 'cloud' | 'not_connected' | 'error'; message?: string }> {
    // If not connected to Google Drive, do not run
    if (!googleDriveService.isAuthenticated()) {
      return { 
        success: false, 
        mode: 'not_connected', 
        message: 'Google Drive is not connected. Automatic cloud backup inactive.' 
      };
    }

    try {
      const payload = await backupRestoreService.generateBackupData(userId, userEmail);
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
      const fileName = `Escrow_Ledger_AutoBackup_15Day_${dateStr}.json`;

      await googleDriveService.uploadBackupFile(payload, fileName);
      this.recordDriveBackupTaken(userId);

      toast.success('Automatic 15-day backup saved to your Google Drive!', {
        duration: 5000,
        id: 'auto-backup-toast'
      });

      return { success: true, mode: 'cloud' };
    } catch (err: any) {
      console.error('Automatic Google Drive backup execution failed:', err);
      return { 
        success: false, 
        mode: 'error', 
        message: err?.message || 'Google Drive backup failed' 
      };
    }
  }
}

export const autoBackupService = new AutoBackupService();
