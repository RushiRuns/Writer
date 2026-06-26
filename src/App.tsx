import React, { useState, useEffect } from 'react';
import Onboarding from './renderer/components/settings/Onboarding';

export default function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check onboarding status on start
    const checkStatus = async () => {
      try {
        const status = await (window as any).wrriter.getVaultStatus();
        if (status.isLoaded && status.path) {
          setVaultPath(status.path);
        }
      } catch (err) {
        console.error('Failed to query vault path status:', err);
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
  }, []);

  const handleVaultSelected = (path: string) => {
    setVaultPath(path);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-brand-amber font-mono">
        Loading Wrriter...
      </div>
    );
  }

  if (!vaultPath) {
    return <Onboarding onVaultSelected={handleVaultSelected} />;
  }

  // Once vault path is selected, show main workspace skeleton
  return (
    <div className="flex h-screen w-screen bg-black text-white overflow-hidden font-ui">
      {/* Sidebar Panel (Pane 1) */}
      <aside className="w-[220px] flex-shrink-0 border-r border-white/10 bg-neutral-950 flex flex-col p-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-neutral-900 border border-brand-amber text-brand-amber font-mono font-bold text-sm">
            W
          </div>
          <span className="font-bold text-lg tracking-tight">Wrriter</span>
        </div>

        <nav className="flex-grow flex flex-col gap-1">
          <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Note Sections</div>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm bg-neutral-900 text-brand-amber border-l-2 border-brand-amber">
            <span>Inbox</span>
            <span className="ml-auto bg-neutral-800 text-neutral-400 text-xs px-2 py-0.5 rounded-full">0</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Later</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Read</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Shop</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Watch</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Tasks</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Journal</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Notes</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Tags</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Drawing Pad</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Archive</span>
          </button>
        </nav>

        <div className="flex flex-col gap-1 border-t border-white/5 pt-4">
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Search</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors">
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Workspace */}
      <main className="flex-grow flex flex-col bg-black">
        {/* Top Bar Bar */}
        <header className="h-[48px] border-b border-white/10 flex items-center justify-between px-6 bg-neutral-950">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Location:</span>
            <span className="text-xs text-neutral-300 font-mono">Inbox</span>
          </div>
          <div className="text-xs text-neutral-400 font-mono truncate max-w-md">
            Vault Root: {vaultPath}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-grow flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-sm animate-fade-in">
            <h2 className="text-xl font-bold tracking-tight text-neutral-200 mb-2">Vault Successfully Active</h2>
            <p className="text-sm text-neutral-500 mb-6">
              Your note vault is now initialized. Missing system directories have been silently bootstrapped in the background.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
