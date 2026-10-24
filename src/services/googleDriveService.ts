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

const ensureGsiLoaded = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      setTimeout(() => resolve(!!(window as any).google?.accounts?.oauth2), 1500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
    setTimeout(() => resolve(!!(window as any).google?.accounts?.oauth2), 2500);
  });
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
    return !!(this.accessToken || this.refreshToken);
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

  // Refresh access token using refresh_token or GIS silent request
  async refreshAccessToken(): Promise<boolean> {
    if (this.refreshToken) {
      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: this.refreshToken,
            grant_type: 'refresh_token'
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.access_token) {
            this.accessToken = data.access_token;
            localStorage.setItem('google_drive_token', data.access_token);
            if (data.refresh_token) {
              this.refreshToken = data.refresh_token;
              localStorage.setItem('google_drive_refresh_token', data.refresh_token);
            }
            return true;
          }
        } else {
          const errText = await res.text();
          console.warn('Google token refresh failed:', errText);
        }
      } catch (err) {
        console.error('Error refreshing Google Drive token:', err);
      }
    }

    // Fallback: If in browser and GIS is loaded, attempt silent prompt
    if (typeof window !== 'undefined') {
      await ensureGsiLoaded();
      if ((window as any).google?.accounts?.oauth2) {
        try {
          const token = await new Promise<string | null>((resolve) => {
            const client = (window as any).google.accounts.oauth2.initTokenClient({
              client_id: CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
              callback: (res: any) => {
                if (res?.access_token) resolve(res.access_token);
                else resolve(null);
              },
              error_callback: () => resolve(null)
            });
            client.requestAccessToken({ prompt: '' });
          });

          if (token) {
            this.accessToken = token;
            localStorage.setItem('google_drive_token', token);
            return true;
          }
        } catch (silentErr) {
          console.warn('GIS silent refresh error:', silentErr);
        }
      }
    }

    return false;
  }

  // HTTP wrapper that injects Authorization header and auto-refreshes on 401
  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken && this.refreshToken) {
      await this.refreshAccessToken();
    }

    if (!this.accessToken) {
      throw new Error('Google Drive is not connected');
    }

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.accessToken}`);

    let res = await fetch(url, { ...options, headers });

    // Handle 401 Unauthorized by auto-refreshing token and retrying once
    if (res.status === 401) {
      console.warn('Google Drive API returned 401 Unauthorized. Refreshing token...');
      const refreshed = await this.refreshAccessToken();
      if (refreshed && this.accessToken) {
        const retryHeaders = new Headers(options.headers || {});
        retryHeaders.set('Authorization', `Bearer ${this.accessToken}`);
        res = await fetch(url, { ...options, headers: retryHeaders });
      } else {
        console.warn('Failed to refresh Google Drive token after 401. Disconnecting...');
        this.disconnect();
      }
    }

    return res;
  }

  // Authenticate user with Google Drive OAuth2
  async authenticate(): Promise<boolean> {
    // 1. Try modern Google Identity Services (GIS)
    await ensureGsiLoaded();

    if ((window as any).google?.accounts?.oauth2) {
      try {
        const token = await new Promise<string | null>((resolve) => {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
            callback: (res: any) => {
              if (res?.access_token) {
                resolve(res.access_token);
              } else {
                resolve(null);
              }
            },
            error_callback: (err: any) => {
              console.warn('GIS error callback:', err);
              resolve(null);
            }
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
    if (!this.isAuthenticated()) return null;
    try {
      const res = await this.fetchWithAuth('https://www.googleapis.com/oauth2/v2/userinfo');
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
    if (!this.isAuthenticated()) throw new Error('Google Drive is not connected');

    // 1. If we have a cached folder ID, check if it's still valid
    if (this.folderId) {
      try {
        const checkRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${this.folderId}?fields=id,name,trashed`);
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
    const searchRes = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name)&pageSize=1`);

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
    const createRes = await this.fetchWithAuth('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
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

    const uploadRes = await this.fetchWithAuth('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size', {
      method: 'POST',
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
    if (!this.isAuthenticated()) return [];

    try {
      const folderId = await this.getOrCreateBackupFolder();
      const query = `'${folderId}' in parents and trashed = false`;
      const res = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id, name, createdTime, size)&orderBy=createdTime desc&pageSize=30`);

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
    if (!this.isAuthenticated()) throw new Error('Not connected to Google Drive');

    const res = await this.fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);

    if (!res.ok) {
      throw new Error('Failed to download backup file from Google Drive');
    }

    return await res.json();
  }
}

export const googleDriveService = new GoogleDriveService();
