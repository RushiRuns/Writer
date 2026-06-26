import React, { useState, useEffect } from 'react';
import Onboarding from './renderer/components/settings/Onboarding';
import Navigation from './renderer/components/layout/Navigation';
import InboxView from './renderer/components/inbox/InboxView';
import ChecklistView from './renderer/components/checklist/ChecklistView';
import NotesView from './renderer/components/notes/NotesView';
import { VaultIndex } from './shared/ipc-types';

export default function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<string>('inbox');
  const [index, setIndex] = useState<VaultIndex>({
    notes: [],
    tagMap: {},
    drawings: [],
    reminders: []
  });

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

  useEffect(() => {
    if (vaultPath) {
      // Fetch initial index
      const fetchIndex = async () => {
        try {
          const idx = await (window as any).wrriter.getVaultIndex();
          setIndex(idx);
        } catch (err) {
          console.error('Failed to fetch initial vault index:', err);
        }
      };
      fetchIndex();

      // Listen for updates from the chokidar watcher
      const unsubscribe = (window as any).wrriter.onIndexUpdate((_event: any, newIndex: VaultIndex) => {
        setIndex(newIndex);
      });

      return () => unsubscribe();
    }
  }, [vaultPath]);

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

  // Render content area based on the active section selection
  const renderContent = () => {
    switch (activeSection) {
      case 'inbox':
        return <InboxView index={index} vaultPath={vaultPath} />;
      case 'later':
      case 'read':
      case 'shop':
      case 'watch':
      case 'tasks':
        return (
          <ChecklistView
            sectionId={activeSection as any}
            index={index}
            _vaultPath={vaultPath}
          />
        );
      case 'notes':
        return <NotesView index={index} _vaultPath={vaultPath} />;
      case 'settings':
        return (
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <h2 className="text-xl font-bold text-neutral-200 mb-2">Settings</h2>
            <p className="text-sm text-neutral-500 max-w-sm mb-4">
              Configuration and preferences management panel.
            </p>
          </div>
        );
      default:
        return (
          <div className="flex-grow flex flex-col items-center justify-center p-8 text-center animate-fade-in">
            <h2 className="text-xl font-bold text-neutral-200 mb-2">{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} View</h2>
            <p className="text-sm text-neutral-500 max-w-sm">
              This section is scheduled for implementation in a subsequent development phase.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen w-screen bg-black text-white overflow-hidden font-ui">
      {/* Sidebar Panel (Pane 1) */}
      <Navigation 
        activeSection={activeSection} 
        onSectionSelect={setActiveSection} 
        index={index} 
        vaultPath={vaultPath} 
      />

      {/* Main Workspace */}
      <main className="flex-grow flex flex-col bg-black">
        {/* Top Bar */}
        <header className="h-[48px] border-b border-white/10 flex items-center justify-between px-6 bg-neutral-950 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Location:</span>
            <span className="text-xs text-brand-amber font-mono font-medium">{activeSection.toUpperCase()}</span>
          </div>
          <div className="text-xs text-neutral-400 font-mono truncate max-w-md">
            Vault: {vaultPath}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-grow flex flex-col overflow-hidden">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
