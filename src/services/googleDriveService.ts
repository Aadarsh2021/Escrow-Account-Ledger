// Google Drive Backup Service for Escrow Account Ledger
export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  createdTime: string;
  size?: string;
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || '';
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_SECRET || '';
const FOLDER_NAME = 'Escrow Ledger Backups';

const getRedirectUri = () => {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/google-drive-callback.html`;
  }
  return 'https://esrow-ledger.web.app/auth/google-drive-callback.html';
};

class GoogleDriveService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private folderId: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('google_drive_token');
      this.refreshToken = localStorage.getItem('google_drive_refresh_token');
      this.folderId = localStorage.getItem('google_drive_folder_id');
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  getFolderId(): string | null {
    return this.folderId;
  }

  disconnect() {
    this.accessToken = null;
    this.refreshToken = null;
    this.folderId = null;
    localStorage.removeItem('google_drive_token');
    localStorage.removeItem('google_drive_refresh_token');
    localStorage.removeItem('google_drive_folder_id');
    localStorage.removeItem('google_drive_user_email');
  }

  // Authenticate user with Google Drive OAuth2
  async authenticate(): Promise<boolean> {
    // 1. Try modern Google Identity Services (GIS) if available
    if ((window as any).google?.accounts?.oauth2) {
      try {
        const token = await new Promise<string | null>((resolve) => {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (res: any) => {
              if (res?.access_token) {
                resolve(res.access_token);
              } else {
                resolve(null);
              }
            },
            error_callback: () => resolve(null)
          });
          client.requestAccessToken({ prompt: 'consent' });
        });

        if (token) {
          this.accessToken = token;
          localStorage.setItem('google_drive_token', token);
          await this.fetchUserInfo();
          return true;
        }
      } catch (gisErr) {
        console.warn('GIS Token Client failed, trying popup OAuth2 fallback:', gisErr);
      }
    }

    // 2. Fallback: Popup OAuth2 flow with callback HTML
    return new Promise((resolve) => {
      const redirectUri = getRedirectUri();
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email')}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${encodeURIComponent(JSON.stringify({ timestamp: Date.now() }))}`;

      const popup = window.open(authUrl, 'google-drive-auth', 'width=520,height=620,scrollbars=yes,resizable=yes');
      if (!popup) {
        alert('Please allow popups to connect your Google Drive.');
        resolve(false);
        return;
      }

      let timeoutId: number;
      let intervalId: number;

      const cleanup = () => {
        window.removeEventListener('message', messageHandler);
        clearTimeout(timeoutId);
        clearInterval(intervalId);
      };

      const handleCode = async (code: string) => {
        cleanup();
        const success = await this.exchangeCode(code);
        resolve(success);
      };

      const messageHandler = (e: MessageEvent) => {
        if (e.origin !== window.location.origin) return;
        if (e.data?.type === 'GOOGLE_DRIVE_AUTH_CODE' && e.data?.code) {
          handleCode(e.data.code);
        }
      };

      window.addEventListener('message', messageHandler);

      // Check localStorage fallback for cross-window / popup restrictions
      intervalId = window.setInterval(() => {
        const code = localStorage.getItem('google_drive_auth_code');
        if (code) {
          localStorage.removeItem('google_drive_auth_code');
          handleCode(code);
        }
      }, 500);

      timeoutId = window.setTimeout(() => {
        cleanup();
        resolve(false);
      }, 3 * 60 * 1000); // 3 minutes timeout
    });
  }

  private async exchangeCode(code: string): Promise<boolean> {
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: getRedirectUri()
        })
      });

      if (!res.ok) {
        const txt = await res.text();
        console.error('OAuth token exchange failed:', txt);
        return false;
      }

      const data = await res.json();
      this.accessToken = data.access_token;
      if (this.accessToken) localStorage.setItem('google_drive_token', this.accessToken);
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
        localStorage.setItem('google_drive_refresh_token', data.refresh_token);
      }

      await this.fetchUserInfo();
      return true;
    } catch (err) {
      console.error('Code exchange error:', err);
      return false;
    }
  }

  // Fetch email of the connected Google account
  private async fetchUserInfo(): Promise<string | null> {
    if (!this.accessToken) return null;
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (res.ok) {
        const info = await res.json();
        if (info?.email) {
          localStorage.setItem('google_drive_user_email', info.email);
          return info.email;
        }
      }
    } catch {}
    return null;
  }

  getConnectedEmail(): string | null {
    return localStorage.getItem('google_drive_user_email');
  }

  // Find or Create the designated backup folder in Google Drive
  async getOrCreateBackupFolder(): Promise<string> {
    if (!this.accessToken) throw new Error('Google Drive is not connected');

    // 1. If we have a cached folder ID, check if it's still valid
    if (this.folderId) {
      try {
        const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files/${this.folderId}?fields=id,name,trashed`, {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        });
        if (checkRes.ok) {
          const data = await checkRes.json();
          if (!data.trashed && data.name === FOLDER_NAME) {
            return this.folderId;
          }
        }
      } catch {}
    }

    // 2. Search for existing folder by name
    const query = `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)&pageSize=1`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const foundId = searchData.files[0].id;
        this.folderId = foundId;
        localStorage.setItem('google_drive_folder_id', foundId);
        return foundId;
      }
    }

    // 3. Folder does not exist: Create it!
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!createRes.ok) {
      throw new Error('Failed to create backup folder in Google Drive');
    }

    const newFolder = await createRes.json();
    this.folderId = newFolder.id;
    localStorage.setItem('google_drive_folder_id', newFolder.id);
    return newFolder.id;
  }

  // Upload backup JSON file inside the backup folder
  async uploadBackupFile(jsonData: object, fileName: string): Promise<GoogleDriveBackupFile> {
    const folderId = await this.getOrCreateBackupFolder();

    const jsonString = JSON.stringify(jsonData, null, 2);
    const fileBlob = new Blob([jsonString], { type: 'application/json' });

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', fileBlob);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      },
      body: form
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Google Drive upload failed: ${uploadRes.status} ${errText}`);
    }

    return await uploadRes.json();
  }

  // List all backup files present in the Google Drive folder
  async listBackups(): Promise<GoogleDriveBackupFile[]> {
    if (!this.accessToken) return [];

    try {
      const folderId = await this.getOrCreateBackupFolder();
      const query = `'${folderId}' in parents and trashed = false`;
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, createdTime, size)&orderBy=createdTime desc&pageSize=30`, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });

      if (!res.ok) return [];
      const data = await res.json();
      return data.files || [];
    } catch (err) {
      console.warn('Error listing Google Drive backups:', err);
      return [];
    }
  }

  // Download and parse backup JSON from Google Drive
  async downloadBackupContent(fileId: string): Promise<any> {
    if (!this.accessToken) throw new Error('Not connected to Google Drive');

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!res.ok) {
      throw new Error('Failed to download backup file from Google Drive');
    }

    return await res.json();
  }
}

export const googleDriveService = new GoogleDriveService();
