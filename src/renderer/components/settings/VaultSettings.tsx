import React, { useState, useEffect } from 'react';
import { FolderOpen, FolderSymlink } from 'lucide-react';
import styles from './VaultSettings.module.css';

export default function VaultSettings() {
  const [vaultPath, setVaultPath] = useState<string>('');
  const [changing, setChanging] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const status = await (window as any).wrriter.getVaultStatus();
        if (status?.path) setVaultPath(status.path);
      } catch (err) {
        console.error('Failed to load vault status:', err);
      }
    };
    load();
  }, []);

  const handleChangeVault = async () => {
    setChanging(true);
    setFeedback(null);
    try {
      const res = await (window as any).wrriter.changeVault();
      if (res?.success && res.path) {
        setVaultPath(res.path);
        setFeedback({ type: 'success', msg: 'Vault changed successfully.' });
      } else if (res && !res.success && res.error) {
        setFeedback({ type: 'error', msg: res.error });
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: String(err) });
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.sectionHeader}>
        <FolderOpen size={13} className={styles.sectionIcon} />
        <span className={styles.sectionTitle}>Vault Directory</span>
      </div>
      <p className={styles.sectionDesc}>
        Your vault is the root folder where all notes and attachments are stored as plain Markdown files.
      </p>

      <div className={styles.pathBox}>
        <FolderSymlink size={14} className={styles.pathIcon} />
        <span className={styles.pathText} title={vaultPath}>
          {vaultPath || 'No vault configured'}
        </span>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.changeBtn}
          onClick={handleChangeVault}
          disabled={changing}
        >
          <FolderOpen size={13} />
          <span>{changing ? 'Selecting…' : 'Change Vault…'}</span>
        </button>
      </div>

      {feedback && (
        <p className={`${styles.feedback} ${feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess}`}>
          {feedback.msg}
        </p>
      )}

      <div className={styles.warningBox}>
        <span className={styles.warningTitle}>⚠ Note</span>
        <span className={styles.warningText}>
          Changing the vault switches Wrriter to read from the new directory immediately. Your existing notes will remain untouched in the previous location.
        </span>
      </div>
    </div>
  );
}
