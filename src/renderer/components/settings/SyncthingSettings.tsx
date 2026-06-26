import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Save, Wifi } from 'lucide-react';
import styles from './SyncthingSettings.module.css';

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
    <div className={styles.container}>
      {/* Title */}
      <div className={styles.header}>
        <Wifi size={18} className={styles.wifiIcon} />
        <h3 className={styles.title}>
          Syncthing Core Integration
        </h3>
      </div>

      {/* Description */}
      <p className={styles.description}>
        Configure your credentials for the local Syncthing daemon to enable top-bar status indicators, polling updates, and manual scanning triggers.
      </p>

      {/* Fields */}
      <div className={styles.fieldsList}>
        {/* URL */}
        <div className={styles.fieldWrapper}>
          <label className={styles.label}>
            Daemon REST URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:8384"
            className={styles.input}
          />
        </div>

        {/* API Key */}
        <div className={styles.fieldWrapper}>
          <label className={styles.label}>
            REST API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter REST API Key..."
            className={`${styles.input} ${styles.inputMono}`}
          />
        </div>

        {/* Folder ID */}
        <div className={styles.fieldWrapper}>
          <label className={styles.label}>
            Sync Folder ID (Optional)
          </label>
          <input
            type="text"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            placeholder="E.g., default (Leave blank to check connection only)"
            className={styles.input}
          />
        </div>
      </div>

      {/* Test Feedback Status Banner */}
      {testStatus.type && (
        <div className={`${styles.feedbackBanner} ${
          testStatus.type === 'success'
            ? styles.feedbackSuccess
            : testStatus.type === 'error'
              ? styles.feedbackError
              : styles.feedbackTesting
        }`}>
          {testStatus.type === 'testing' && <RefreshCw size={14} className="animate-spin text-brand-amber" />}
          {testStatus.type === 'success' && <CheckCircle2 size={14} />}
          {testStatus.type === 'error' && <AlertCircle size={14} />}
          <span className="font-medium">{testStatus.message}</span>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actionsRow}>
        <button
          onClick={handleTestConnection}
          disabled={testStatus.type === 'testing'}
          className={styles.testBtn}
        >
          <RefreshCw size={13} className={testStatus.type === 'testing' ? 'animate-spin' : ''} />
          <span>Test Connection</span>
        </button>

        <div className={styles.saveActions}>
          {saveStatus && (
            <span className={styles.saveStatusText}>{saveStatus}</span>
          )}
          <button
            onClick={handleSave}
            className={styles.saveBtn}
          >
            <Save size={13} />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
