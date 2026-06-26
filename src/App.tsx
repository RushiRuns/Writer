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
import styles from './App.module.css';

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
  const [breadcrumb, setBreadcrumb] = useState<string>('Inbox');
  const [index, setIndex] = useState<VaultIndex>({
    notes: [],
    tagMap: {},
    drawings: [],
    reminders: []
  });

  // Automatically update general breadcrumb label for non-notes sections
  useEffect(() => {
    if (activeSection !== 'notes') {
      const sectionLabels: Record<string, string> = {
        inbox: 'Inbox',
        later: 'Later',
        read: 'Read',
        shop: 'Shop',
        watch: 'Watch',
        tasks: 'Tasks',
        journal: 'Journal',
        tags: 'Tags',
        drawing: 'Drawing Pad',
        archive: 'Archive',
        settings: 'Settings'
      };
      setBreadcrumb(sectionLabels[activeSection] || activeSection.toUpperCase());
    }
  }, [activeSection]);

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
      <div className={styles.loadingScreen}>
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
        return <NotesView index={index} _vaultPath={vaultPath} onBreadcrumbChange={setBreadcrumb} />;
      case 'drawing':
        return <DrawingView index={index} _vaultPath={vaultPath} />;
      case 'settings':
        return (
          <div className={styles.settingsWrapper}>
            <h2 className={styles.settingsTitle}>Settings</h2>
            <p className={styles.settingsSubtitle}>
              Configuration and preferences management panel.
            </p>
            <div className={styles.settingsInner}>
              <SyncthingSettings />
            </div>
          </div>
        );
      default:
        return (
          <div className={styles.fallbackView}>
            <h2 className={styles.fallbackTitle}>{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} View</h2>
            <p className={styles.fallbackText}>
              This section is scheduled for implementation in a subsequent development phase.
            </p>
          </div>
        );
    }
  };

  return (
    <div className={styles.container}>
      {/* Sidebar Panel (Pane 1) */}
      <Navigation 
        activeSection={activeSection} 
        onSectionSelect={setActiveSection} 
        index={index} 
        vaultPath={vaultPath} 
      />

      {/* Main Workspace */}
      <main className={styles.main}>
        {/* Top Bar */}
        <header className={styles.header}>
          {/* Syncthing Link on Left */}
          <div className={styles.leftHeader}>
            <div className={styles.statusGroup}>
              <div 
                className={`${styles.statusDot} ${
                  syncthingStatus.status === 'synced' 
                    ? styles.statusSynced 
                    : syncthingStatus.status === 'syncing'
                      ? styles.statusSyncing
                      : styles.statusDisconnected
                }`}
              />
              
              {/* Tooltip */}
              <div className={styles.tooltip}>
                <div className={styles.tooltipHeader}>
                  Syncthing Link
                </div>
                <div className={styles.tooltipRow}>
                  <span>State:</span>
                  <span className={
                    syncthingStatus.status === 'synced' 
                      ? styles.tooltipStateSynced 
                      : syncthingStatus.status === 'syncing'
                        ? styles.tooltipStateSyncing
                        : styles.tooltipStateDisconnected
                  }>
                    {syncthingStatus.status}
                  </span>
                </div>
                {syncthingStatus.status !== 'disconnected' && (
                  <>
                    <div className={styles.tooltipRow}>
                      <span>Device ID:</span>
                      <span className={styles.tooltipValue}>{syncthingStatus.deviceName || 'Unknown'}</span>
                    </div>
                    <div className={styles.tooltipRow}>
                      <span>Connected:</span>
                      <span className={styles.tooltipValue}>{syncthingStatus.connectedDevices} {syncthingStatus.connectedDevices === 1 ? 'device' : 'devices'}</span>
                    </div>
                    {syncthingStatus.version && (
                      <div className={styles.tooltipRow}>
                        <span>Version:</span>
                        <span className={styles.tooltipValue}>{syncthingStatus.version}</span>
                      </div>
                    )}
                  </>
                )}
                {syncthingStatus.status === 'disconnected' && (
                  <div className={styles.tooltipTextMuted}>
                    Daemon offline or configuration error
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Centered Breadcrumb */}
          <div className={styles.centerHeader}>
            <span className={styles.appBreadcrumb}>{breadcrumb}</span>
          </div>

          {/* Right Header Actions */}
          <div className={styles.rightHeader}>
            {/* Focus Timer Pill */}
            <div className={styles.timerPill}>
              <span className={`${styles.timerText} ${isActive ? styles.timerTextActive : ''}`}>
                {mode === 'focus' ? 'Focus' : 'Break'}: {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
              <div className={styles.timerDivider} />
              <button
                onClick={isActive ? pause : start}
                className={styles.timerBtn}
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
                className={styles.timerBtn}
                title="Reset Session"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12"/></svg>
              </button>
              {mode === 'focus' && (
                <button
                  onClick={skip}
                  className={styles.timerBtn}
                  title="Skip Session"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                </button>
              )}
            </div>

            {/* Ambient Sounds Mixer Popover Button */}
            <AudioManager />
          </div>
        </header>

        {/* Content Area */}
        <div className={styles.contentWrapper}>
          {renderContent()}
        </div>
      </main>

      {/* Break overlay block lock portal */}
      <TimerOverlay />
    </div>
  );
}


