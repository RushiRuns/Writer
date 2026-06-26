import React, { useState, useEffect } from 'react';
import Onboarding from './renderer/components/settings/Onboarding';
import Navigation from './renderer/components/layout/Navigation';
import InboxView from './renderer/components/inbox/InboxView';
import ChecklistView from './renderer/components/checklist/ChecklistView';
import NotesView from './renderer/components/notes/NotesView';
import DrawingView from './renderer/components/drawing/DrawingView';
import CommandPalette from './renderer/components/command-palette/CommandPalette';
import FloatingWindow from './renderer/components/floating-window/FloatingWindow';
import { VaultIndex } from './shared/ipc-types';
import { TimerProvider, useTimer } from './renderer/contexts/TimerContext';
import TimerOverlay from './renderer/components/timer/TimerOverlay';
import AudioManager from './renderer/components/ambient-sounds/AudioManager';
import SyncthingSettings from './renderer/components/settings/SyncthingSettings';

export default function App() {
  return (
    <TimerProvider>
      <AppContent />
    </TimerProvider>
  );
}

function AppContent() {
  const [appMode, setAppMode] = useState<'main' | 'palette' | 'floating'>('main');
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<string>('inbox');
  const [index, setIndex] = useState<VaultIndex>({
    notes: [],
    tagMap: {},
    drawings: [],
    reminders: []
  });

  const { timeLeft, isActive, start, pause, reset, skip, mode } = useTimer();

  const [syncthingStatus, setSyncthingStatus] = useState<{
    status: 'synced' | 'syncing' | 'disconnected';
    connectedDevices: number;
    deviceName?: string;
    version?: string;
  }>({
    status: 'disconnected',
    connectedDevices: 0
  });

  // Poll Syncthing status every 10 seconds
  useEffect(() => {
    if (appMode !== 'main') return;

    const fetchStatus = async () => {
      try {
        const status = await (window as any).wrriter.getSyncthingStatus();
        setSyncthingStatus(status);
      } catch (err) {
        console.error('Error fetching Syncthing status:', err);
        setSyncthingStatus({ status: 'disconnected', connectedDevices: 0 });
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [appMode]);

  // Parse query parameters to determine window mode (main app vs utility popovers)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    if (modeParam === 'palette') {
      setAppMode('palette');
      setLoading(false);
    } else if (modeParam === 'floating') {
      setAppMode('floating');
      setLoading(false);
    } else {
      setAppMode('main');
      
      // Check onboarding status on start (only needed for main window)
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
    }
  }, []);

  // Load and apply saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const settings = await (window as any).wrriter.getSettings();
        if (settings && settings.theme) {
          document.documentElement.setAttribute('data-theme', settings.theme);
        }
      } catch (err) {
        console.error('Failed to load theme on mount:', err);
      }
    };
    loadTheme();
  }, []);

  // Handle global command palette actions
  useEffect(() => {
    const unsubscribe = (window as any).wrriter.onNavigateNote(async (_event: any, action: string) => {
      if (action === 'new-note') {
        try {
          const res = await (window as any).wrriter.createNote('', 'Untitled');
          if (res.success) {
            setActiveSection('notes');
          }
        } catch (err) {
          console.error('Failed to create new note from command palette:', err);
        }
      } else if (action === 'toggle-theme') {
        try {
          const settings = await (window as any).wrriter.getSettings();
          const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
          await (window as any).wrriter.setSettings({ theme: nextTheme });
          document.documentElement.setAttribute('data-theme', nextTheme);
        } catch (err) {
          console.error('Failed to toggle theme:', err);
        }
      } else if (action.startsWith('switch-')) {
        const targetSection = action.replace('switch-', '');
        setActiveSection(targetSection);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (vaultPath && appMode === 'main') {
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
  }, [vaultPath, appMode]);

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

  // Render utility windows directly
  if (appMode === 'palette') {
    return <CommandPalette />;
  }

  if (appMode === 'floating') {
    return <FloatingWindow />;
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
      case 'drawing':
        return <DrawingView index={index} _vaultPath={vaultPath} />;
      case 'settings':
        return (
          <div className="flex-grow flex flex-col items-center p-8 overflow-y-auto animate-fade-in">
            <h2 className="text-xl font-bold text-neutral-200 mb-2">Settings</h2>
            <p className="text-sm text-neutral-500 max-w-sm mb-6 text-center">
              Configuration and preferences management panel.
            </p>
            <div className="w-full max-w-lg">
              <SyncthingSettings />
            </div>
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
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Location:</span>
            <span className="text-xs text-brand-amber font-mono font-medium mr-2">{activeSection.toUpperCase()}</span>
            
            {/* Syncthing Status Indicator */}
            <div className="relative group flex items-center">
              <div 
                className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  syncthingStatus.status === 'synced' 
                    ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' 
                    : syncthingStatus.status === 'syncing'
                      ? 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.5)] animate-pulse'
                      : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                }`}
              />
              
              {/* Tooltip */}
              <div className="absolute top-6 left-0 invisible group-hover:visible bg-[#121212] border border-white/5 text-neutral-300 rounded-md p-3 text-[11px] leading-relaxed shadow-2xl z-50 w-52 pointer-events-none select-none font-sans transition-all duration-200 opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0">
                <div className="font-mono text-[9px] uppercase tracking-wider text-neutral-500 mb-1.5 pb-1 border-b border-white/5">
                  Syncthing Link
                </div>
                <div className="flex justify-between mb-1">
                  <span>State:</span>
                  <span className={`font-semibold capitalize ${
                    syncthingStatus.status === 'synced' 
                      ? 'text-green-400' 
                      : syncthingStatus.status === 'syncing'
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}>
                    {syncthingStatus.status}
                  </span>
                </div>
                {syncthingStatus.status !== 'disconnected' && (
                  <>
                    <div className="flex justify-between mb-1">
                      <span>Device ID:</span>
                      <span className="font-mono text-neutral-200">{syncthingStatus.deviceName || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span>Connected:</span>
                      <span className="text-neutral-200">{syncthingStatus.connectedDevices} {syncthingStatus.connectedDevices === 1 ? 'device' : 'devices'}</span>
                    </div>
                    {syncthingStatus.version && (
                      <div className="flex justify-between">
                        <span>Version:</span>
                        <span className="text-neutral-400 font-mono text-[10px]">{syncthingStatus.version}</span>
                      </div>
                    )}
                  </>
                )}
                {syncthingStatus.status === 'disconnected' && (
                  <div className="text-[10px] text-neutral-500 mt-1 leading-normal italic">
                    Daemon offline or configuration error
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Focus Timer Pill */}
            <div className="flex items-center gap-2 bg-neutral-900 border border-white/5 px-2.5 py-1 rounded-md h-[32px]">
              <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isActive ? 'text-brand-amber animate-pulse' : 'text-neutral-400'}`}>
                {mode === 'focus' ? 'Focus' : 'Break'}: {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
              <div className="w-[1px] h-3.5 bg-white/10 mx-1" />
              <button
                onClick={isActive ? pause : start}
                className="text-neutral-400 hover:text-brand-amber transition-colors p-0.5"
                title={isActive ? 'Pause' : 'Start'}
              >
                {isActive ? (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button
                onClick={reset}
                className="text-neutral-400 hover:text-brand-amber transition-colors p-0.5"
                title="Reset Session"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12"/></svg>
              </button>
              {mode === 'focus' && (
                <button
                  onClick={skip}
                  className="text-neutral-400 hover:text-brand-amber transition-colors p-0.5"
                  title="Skip Session"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
              )}
            </div>

            {/* Ambient Sounds Mixer Popover Button */}
            <AudioManager />

            <div className="text-xs text-neutral-500 font-mono truncate max-w-xs md:max-w-md hidden sm:block">
              Vault: {vaultPath}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-grow flex flex-col overflow-hidden">
          {renderContent()}
        </div>
      </main>

      {/* Break overlay block lock portal */}
      <TimerOverlay />
    </div>
  );
}


