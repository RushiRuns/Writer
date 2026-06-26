import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Save, Wifi } from 'lucide-react';

export default function SyncthingSettings() {
  const [url, setUrl] = useState('http://localhost:8384');
  const [apiKey, setApiKey] = useState('');
  const [folderId, setFolderId] = useState('');
  
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | 'testing' | null; message: string }>({
    type: null,
    message: ''
  });

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Load current Syncthing configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await (window as any).wrriter.getSyncthingConfig();
        if (config) {
          setUrl(config.url || 'http://localhost:8384');
          setApiKey(config.apiKey || '');
          setFolderId(config.folderId || '');
        }
      } catch (err) {
        console.error('Failed to load Syncthing config:', err);
      }
    };
    loadConfig();
  }, []);

  const handleTestConnection = async () => {
    if (!url.trim() || !apiKey.trim()) {
      setTestStatus({ type: 'error', message: 'URL and API Key are required' });
      return;
    }

    setTestStatus({ type: 'testing', message: 'Testing connection...' });

    try {
      const res = await (window as any).wrriter.testSyncthingConnection(url, apiKey);
      if (res.success) {
        setTestStatus({ type: 'success', message: 'Connection successful!' });
      } else {
        setTestStatus({ type: 'error', message: res.error || 'Connection failed' });
      }
    } catch (err) {
      setTestStatus({ type: 'error', message: String(err) });
    }
  };

  const handleSave = async () => {
    setSaveStatus('Saving...');
    try {
      await (window as any).wrriter.setSyncthingConfig({
        url: url.trim(),
        apiKey: apiKey.trim(),
        folderId: folderId.trim() || null
      });
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('Failed to save settings');
    }
  };

  return (
    <div className="w-full max-w-lg bg-[#121212] border border-white/5 rounded-lg p-6 shadow-lg select-none text-neutral-300">
      {/* Title */}
      <div className="flex items-center gap-2 mb-6 pb-2.5 border-b border-white/5">
        <Wifi size={18} className="text-brand-amber animate-pulse" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-200 font-mono">
          Syncthing Core Integration
        </h3>
      </div>

      {/* Description */}
      <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
        Configure your credentials for the local Syncthing daemon to enable top-bar status indicators, polling updates, and manual scanning triggers.
      </p>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        {/* URL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold font-mono">
            Daemon REST URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:8384"
            className="bg-black border border-white/5 focus:border-brand-amber/50 rounded-md px-3 py-2 text-xs text-neutral-200 outline-none w-full font-sans transition-all"
          />
        </div>

        {/* API Key */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold font-mono">
            REST API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter REST API Key..."
            className="bg-black border border-white/5 focus:border-brand-amber/50 rounded-md px-3 py-2 text-xs text-neutral-200 outline-none w-full font-mono transition-all"
          />
        </div>

        {/* Folder ID */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold font-mono">
            Sync Folder ID (Optional)
          </label>
          <input
            type="text"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            placeholder="E.g., default (Leave blank to check connection only)"
            className="bg-black border border-white/5 focus:border-brand-amber/50 rounded-md px-3 py-2 text-xs text-neutral-200 outline-none w-full font-sans transition-all"
          />
        </div>
      </div>

      {/* Test Feedback Status Banner */}
      {testStatus.type && (
        <div className={`mt-5 p-3 rounded-md border text-xs flex items-center gap-2.5 transition-all ${
          testStatus.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : testStatus.type === 'error'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-neutral-900 border-white/5 text-neutral-400'
        }`}>
          {testStatus.type === 'testing' && <RefreshCw size={14} className="animate-spin text-brand-amber" />}
          {testStatus.type === 'success' && <CheckCircle2 size={14} />}
          {testStatus.type === 'error' && <AlertCircle size={14} />}
          <span className="font-medium">{testStatus.message}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-4 mt-6 pt-5 border-t border-white/5">
        <button
          onClick={handleTestConnection}
          disabled={testStatus.type === 'testing'}
          className="flex items-center gap-1.5 border border-white/10 hover:border-brand-amber/40 text-neutral-300 hover:text-brand-amber disabled:border-neutral-800 disabled:text-neutral-600 px-4 py-2 rounded-md text-xs font-semibold font-ui transition-all"
        >
          <RefreshCw size={13} className={testStatus.type === 'testing' ? 'animate-spin' : ''} />
          <span>Test Connection</span>
        </button>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs text-neutral-500 font-mono animate-fade-in">{saveStatus}</span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-brand-amber hover:bg-amber-600 text-black px-4 py-2 rounded-md text-xs font-semibold font-ui shadow transition-all border border-brand-amber/20 hover:border-amber-500/20"
          >
            <Save size={13} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
