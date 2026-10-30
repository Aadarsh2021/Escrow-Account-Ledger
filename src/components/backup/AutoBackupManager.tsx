import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { autoBackupService } from '../../services/autoBackupService';
import { googleDriveService } from '../../services/googleDriveService';

/**
 * AutoBackupManager handles automated Google Drive backup every 15 days.
 *
 * Requirements:
 * 1. Until Google Drive is connected, NO automatic backup or popups will occur.
 * 2. Local backup is purely manual when the user chooses to download it.
 * 3. Once Google Drive is connected, it automatically runs in the background
 *    every 15 days and uploads the latest backup snapshot to Google Drive.
 */
export const AutoBackupManager: React.FC = () => {
  const { user } = useAuth();
  const isRunningRef = useRef(false);

  const checkAndRunAutoBackup = async () => {
    if (!user || isRunningRef.current) return;

    // Online backup only runs when user has connected Google Drive
    if (!googleDriveService.isAuthenticated()) {
      return;
    }

    // Check if 15 days have passed since the last Drive backup
    if (!autoBackupService.isBackupDue(user.id)) {
      return;
    }

    try {
      isRunningRef.current = true;
      console.log('15-Day Auto-Backup: Triggering automatic Google Drive backup...');
      await autoBackupService.runAutomaticBackup(user.id, user.email || undefined);
    } catch (err) {
      console.error('15-Day Auto-Backup error:', err);
    } finally {
      isRunningRef.current = false;
    }
  };

  useEffect(() => {
    if (!user) return;

    // Run check on mount
    checkAndRunAutoBackup();

    // Recheck periodically every hour while app is open
    const interval = setInterval(() => {
      checkAndRunAutoBackup();
    }, 60 * 60 * 1000);

    const handleBackupChange = () => {
      checkAndRunAutoBackup();
    };

    window.addEventListener('escrow_auto_backup_change', handleBackupChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('escrow_auto_backup_change', handleBackupChange);
    };
  }, [user?.id]);

  // Completely headless - runs silently in the background without UI popups
  return null;
};
