import { configStore } from '../vault/file-ops';

export interface SyncthingStatus {
  status: 'synced' | 'syncing' | 'disconnected';
  connectedDevices: number;
  deviceName?: string;
  version?: string;
}

export async function getSyncthingStatus(): Promise<SyncthingStatus> {
  const config = configStore.get('syncthing');
  if (!config || !config.url || !config.apiKey) {
    return { status: 'disconnected', connectedDevices: 0 };
  }

  const url = config.url.replace(/\/$/, '');
  const apiKey = config.apiKey;

  try {
    // 1. Fetch system status
    const statusRes = await fetch(`${url}/rest/system/status`, {
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(2000)
    });

    if (!statusRes.ok) {
      return { status: 'disconnected', connectedDevices: 0 };
    }

    const statusData: any = await statusRes.json();
    const deviceName = statusData.myID ? statusData.myID.slice(0, 7) : 'Local';
    const version = statusData.version ?? '';

    // 2. Fetch connections
    const connRes = await fetch(`${url}/rest/system/connections`, {
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(2000)
    });
    
    let connectedDevices = 0;
    if (connRes.ok) {
      const connData: any = await connRes.json();
      if (connData.connections) {
        connectedDevices = Object.values(connData.connections).filter((c: any) => c.connected).length;
      }
    }

    // 3. Determine sync status (check if active syncing is happening on folders)
    let isSyncing = false;
    const folderId = config.folderId;
    if (folderId) {
      const folderRes = await fetch(`${url}/rest/db/status?folder=${folderId}`, {
        headers: { 'X-API-Key': apiKey },
        signal: AbortSignal.timeout(2000)
      });
      if (folderRes.ok) {
        const folderData: any = await folderRes.json();
        if (folderData.state && folderData.state !== 'idle') {
          isSyncing = true;
        }
      }
    }

    return {
      status: isSyncing ? 'syncing' : 'synced',
      connectedDevices,
      deviceName,
      version
    };
  } catch (err) {
    return { status: 'disconnected', connectedDevices: 0 };
  }
}

export async function triggerSyncthingScan(): Promise<{ success: boolean; error?: string }> {
  const config = configStore.get('syncthing');
  if (!config || !config.url || !config.apiKey) {
    return { success: false, error: 'Syncthing is not configured' };
  }

  const url = config.url.replace(/\/$/, '');
  const apiKey = config.apiKey;
  const folderId = config.folderId || 'default';

  try {
    const res = await fetch(`${url}/rest/db/scan?folder=${folderId}`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(3000)
    });

    if (res.ok) {
      return { success: true };
    }
    return { success: false, error: `HTTP ${res.status}: ${res.statusText}` };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function testSyncthingConnection(targetUrl: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  const url = targetUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${url}/rest/system/ping`, {
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(3000)
    });

    if (res.ok) {
      const data: any = await res.json();
      if (data.ping === 'pong') {
        return { success: true };
      }
    }
    return { success: false, error: `Invalid response (HTTP ${res.status})` };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
