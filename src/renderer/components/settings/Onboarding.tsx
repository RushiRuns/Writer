import React, { useState } from 'react';
import { FolderPlus, FolderOpen, AlertCircle } from 'lucide-react';

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
    <div className="flex h-screen w-screen items-center justify-center bg-black text-white selection:bg-brand-amber selection:text-black">
      <div className="w-full max-w-md p-8 border border-white/10 rounded-lg bg-neutral-900/40 backdrop-blur-md shadow-2xl animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-neutral-900 border border-brand-amber text-brand-amber mb-4">
            <span className="text-3xl font-mono font-bold">W</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Welcome to Wrriter</h1>
          <p className="text-sm text-neutral-400 text-center">
            A portable, offline-first Markdown notes vault.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 text-sm text-red-400 border border-red-500/20 bg-red-950/20 rounded-md">
            <AlertCircle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <button
            onClick={handleSelectVault}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 border border-brand-amber/30 hover:border-brand-amber text-white hover:bg-brand-amber/10 hover:shadow-glow rounded-md transition-all duration-150 disabled:opacity-50"
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
            className="flex items-center justify-center gap-3 w-full py-3 px-4 border border-white/5 hover:border-white/20 text-neutral-200 hover:bg-white/5 rounded-md transition-all duration-150 disabled:opacity-50"
          >
            <FolderOpen size={20} className="text-neutral-400" />
            <div className="text-left">
              <div className="font-semibold text-sm">Open Existing Vault</div>
              <div className="text-xs text-neutral-400">Select an existing notes directory</div>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-neutral-500">
          Syncs seamlessly with Android via Syncthing.
        </div>
      </div>
    </div>
  );
}
