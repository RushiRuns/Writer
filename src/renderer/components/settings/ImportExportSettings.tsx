import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileDown,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import styles from './ImportExportSettings.module.css';

type Status = { type: 'idle' | 'loading' | 'success' | 'error'; msg: string };

const idle: Status = { type: 'idle', msg: '' };

interface Props {
  currentNotePath: string | null;
}

export default function ImportExportSettings({ currentNotePath }: Props) {
  const [importStatus, setImportStatus] = useState<Status>(idle);
  const [exportVaultStatus, setExportVaultStatus] = useState<Status>(idle);
  const [exportNoteStatus, setExportNoteStatus] = useState<Status>(idle);

  const handleImport = async () => {
    setImportStatus({ type: 'loading', msg: 'Selecting files…' });
    try {
      const res = await (window as any).wrriter.importFiles();
      if (!res) {
        setImportStatus(idle);
        return;
      }
      if (res.success) {
        setImportStatus({ type: 'success', msg: `Imported ${res.imported} file${res.imported !== 1 ? 's' : ''} into Inbox.` });
      } else if (res.error) {
        setImportStatus({ type: 'error', msg: res.error });
      } else {
        setImportStatus(idle);
      }
    } catch (err) {
      setImportStatus({ type: 'error', msg: String(err) });
    }
    setTimeout(() => setImportStatus(idle), 5000);
  };

  const handleExportVault = async () => {
    setExportVaultStatus({ type: 'loading', msg: 'Preparing archive…' });
    try {
      const res = await (window as any).wrriter.exportVault();
      if (!res) {
        setExportVaultStatus(idle);
        return;
      }
      if (res.success) {
        setExportVaultStatus({ type: 'success', msg: 'Vault exported successfully.' });
      } else if (res.error) {
        setExportVaultStatus({ type: 'error', msg: res.error });
      } else {
        setExportVaultStatus(idle);
      }
    } catch (err) {
      setExportVaultStatus({ type: 'error', msg: String(err) });
    }
    setTimeout(() => setExportVaultStatus(idle), 5000);
  };

  const handleExportNote = async () => {
    if (!currentNotePath) return;
    setExportNoteStatus({ type: 'loading', msg: 'Saving…' });
    try {
      const res = await (window as any).wrriter.exportNote(currentNotePath);
      if (!res) {
        setExportNoteStatus(idle);
        return;
      }
      if (res.success) {
        setExportNoteStatus({ type: 'success', msg: 'Note exported.' });
      } else if (res.error) {
        setExportNoteStatus({ type: 'error', msg: res.error });
      } else {
        setExportNoteStatus(idle);
      }
    } catch (err) {
      setExportNoteStatus({ type: 'error', msg: String(err) });
    }
    setTimeout(() => setExportNoteStatus(idle), 5000);
  };

  return (
    <div className={styles.card}>
      {/* Import */}
      <div className={styles.action}>
        <div className={styles.actionText}>
          <div className={styles.actionTitle}>
            <Upload size={13} className={styles.actionIcon} />
            Import Markdown Files
          </div>
          <p className={styles.actionDesc}>
            Copy <code>.md</code> files from your computer into the vault's Inbox folder.
          </p>
        </div>
        <button
          className={styles.btn}
          onClick={handleImport}
          disabled={importStatus.type === 'loading'}
        >
          {importStatus.type === 'loading'
            ? <Loader2 size={13} className={styles.spin} />
            : <Upload size={13} />}
          <span>Import…</span>
        </button>
        <StatusLine status={importStatus} />
      </div>

      <div className={styles.divider} />

      {/* Export Vault */}
      <div className={styles.action}>
        <div className={styles.actionText}>
          <div className={styles.actionTitle}>
            <Download size={13} className={styles.actionIcon} />
            Export Vault as ZIP
          </div>
          <p className={styles.actionDesc}>
            Pack all notes and attachments into a single <code>.zip</code> archive.
          </p>
        </div>
        <button
          className={styles.btn}
          onClick={handleExportVault}
          disabled={exportVaultStatus.type === 'loading'}
        >
          {exportVaultStatus.type === 'loading'
            ? <Loader2 size={13} className={styles.spin} />
            : <Download size={13} />}
          <span>Export ZIP…</span>
        </button>
        <StatusLine status={exportVaultStatus} />
      </div>

      <div className={styles.divider} />

      {/* Export Current Note */}
      <div className={styles.action}>
        <div className={styles.actionText}>
          <div className={styles.actionTitle}>
            <FileDown size={13} className={styles.actionIcon} />
            Export Current Note
          </div>
          <p className={styles.actionDesc}>
            {currentNotePath
              ? `Save the active note as a standalone <code>.md</code> file.`
              : 'Open a note in the editor to enable this option.'}
          </p>
        </div>
        <button
          className={`${styles.btn} ${!currentNotePath ? styles.btnDisabled : ''}`}
          onClick={handleExportNote}
          disabled={!currentNotePath || exportNoteStatus.type === 'loading'}
        >
          {exportNoteStatus.type === 'loading'
            ? <Loader2 size={13} className={styles.spin} />
            : <FileDown size={13} />}
          <span>Export Note…</span>
        </button>
        <StatusLine status={exportNoteStatus} />
      </div>
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.type === 'idle' || !status.msg) return null;
  return (
    <div className={`${styles.statusLine} ${styles[`status_${status.type}`]}`}>
      {status.type === 'success' && <CheckCircle2 size={11} />}
      {status.type === 'error' && <AlertCircle size={11} />}
      {status.type === 'loading' && <Loader2 size={11} className={styles.spin} />}
      <span>{status.msg}</span>
    </div>
  );
}
