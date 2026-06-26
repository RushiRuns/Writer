import React, { useState } from 'react';
import { FolderPlus, FolderOpen, AlertCircle } from 'lucide-react';
import styles from './Onboarding.module.css';

interface OnboardingProps {
  onVaultSelected: (path: string) => void;
}

export default function Onboarding({ onVaultSelected }: OnboardingProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectVault = async () => {
    setError(null);
    setLoading(true);
    try {
      // Exposes call to window.wrriter context bridge
      const result = await (window as any).wrriter.selectVault();
      if (result.success && result.path) {
        onVaultSelected(result.path);
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to select vault directory.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <span className={styles.logoText}>W</span>
          </div>
          <h1 className={styles.title}>Welcome to Wrriter</h1>
          <p className={styles.description}>
            A portable, offline-first Markdown notes vault.
          </p>
        </div>

        {error && (
          <div className={styles.errorBox}>
            <AlertCircle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.buttonList}>
          <button
            onClick={handleSelectVault}
            disabled={loading}
            className={styles.primaryBtn}
          >
            <FolderPlus size={20} className="text-brand-amber" />
            <div className="text-left">
              <div className="font-semibold text-sm">Create New Vault</div>
              <div className="text-xs text-neutral-400">Initialize a new empty notes folder</div>
            </div>
          </button>

          <button
            onClick={handleSelectVault}
            disabled={loading}
            className={styles.secondaryBtn}
          >
            <FolderOpen size={20} className="text-neutral-400" />
            <div className="text-left">
              <div className="font-semibold text-sm">Open Existing Vault</div>
              <div className="text-xs text-neutral-400">Select an existing notes directory</div>
            </div>
          </button>
        </div>

        <div className={styles.footer}>
          Syncs seamlessly with Android via Syncthing.
        </div>
      </div>
    </div>
  );
}
