import React, { useState, useEffect } from 'react';
import Onboarding from './renderer/components/settings/Onboarding';
import Navigation from './renderer/components/layout/Navigation';
import InboxView from './renderer/components/inbox/InboxView';
import ChecklistView from './renderer/components/checklist/ChecklistView';
import NotesView from './renderer/components/notes/NotesView';
import DrawingView from './renderer/components/drawing/DrawingView';
import JournalView from './renderer/components/journal/JournalView';
import TagsView from './renderer/components/tags/TagsView';
import ArchiveView from './renderer/components/archive/ArchiveView';
import CommandPalette from './renderer/components/command-palette/CommandPalette';
import FloatingWindow from './renderer/components/floating-window/FloatingWindow';
import { VaultIndex } from './shared/ipc-types';
import { TimerProvider, useTimer } from './renderer/contexts/TimerContext';
import TimerOverlay from './renderer/components/timer/TimerOverlay';
import AudioManager from './renderer/components/ambient-sounds/AudioManager';
import SyncthingSettings from './renderer/components/settings/SyncthingSettings';
import { Cloud, CloudOff, Hourglass, Dice5, AppWindow } from 'lucide-react';
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
  const [targetNotePath, setTargetNotePath] = useState<string | null>(null);

  const handleRandomNote = () => {
    if (index.notes.length === 0) return;
    const randomIdx = Math.floor(Math.random() * index.notes.length);
    const note = index.notes[randomIdx];
    setActiveSection('notes');
    setTargetNotePath(note.path);
  };

  const handleToggleFloating = async () => {
    try {
      await (window as any).wrriter.toggleFloatingWindow();
    } catch (err) {
      console.error('Failed to toggle floating window:', err);
    }
  };

  const handleSyncScan = async () => {
    try {
      await (window as any).wrriter.triggerSyncthingScan();
    } catch (err) {
      console.error('Failed to trigger scan:', err);
    }
  };

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
        return (
          <NotesView 
            index={index} 
            _vaultPath={vaultPath} 
            onBreadcrumbChange={setBreadcrumb} 
            targetNotePath={targetNotePath} 
            onClearTargetNotePath={() => setTargetNotePath(null)} 
          />
        );
      case 'drawing':
        return <DrawingView index={index} _vaultPath={vaultPath} />;
      case 'journal':
        return <JournalView index={index} vaultPath={vaultPath} />;
      case 'tags':
        return <TagsView index={index} vaultPath={vaultPath} />;
      case 'archive':
        return <ArchiveView index={index} vaultPath={vaultPath} />;
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
      {/* Top Bar */}
      <header className={styles.header}>
        {/* Syncthing Link on Left */}
        <div className={styles.leftHeader}>
          <div className={styles.logo}>
            <span className={styles.logoW}>W</span>
            <span className={styles.logoGemini}>Gemini</span>
          </div>
        </div>

        {/* Centered Breadcrumb */}
        <div className={styles.centerHeader}>
          <span className={styles.appBreadcrumb}>{breadcrumb}</span>
        </div>

        {/* Right Header Actions */}
        <div className={styles.rightHeader}>
          {/* Syncthing Link Status */}
          <div className={styles.statusGroup}>
            <button
              onClick={handleSyncScan}
              className={`${styles.iconBtn} ${
                syncthingStatus.status === 'synced' 
                  ? styles.syncSynced 
                  : syncthingStatus.status === 'syncing'
                    ? styles.syncSyncing
                    : styles.syncDisconnected
              }`}
              title="Click to trigger manual Syncthing scan"
            >
              {syncthingStatus.status === 'disconnected' ? (
                <CloudOff size={16} />
              ) : (
                <Cloud size={16} />
              )}
            </button>
            
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

          {/* Ambient Sounds Mixer Popover Button */}
          <AudioManager />

          {/* Focus Timer Hourglass Icon */}
          <button
            onClick={isActive ? pause : start}
            onContextMenu={(e) => {
              e.preventDefault();
              reset();
            }}
            className={`${styles.iconBtn} ${isActive ? styles.timerActive : ''}`}
            title={`Timer: ${mode === 'focus' ? 'Focus' : 'Break'} (${Math.floor(timeLeft / 60).toString().padStart(2, '0')}:${(timeLeft % 60).toString().padStart(2, '0')}). Click to toggle, Right-click to reset.`}
          >
            <Hourglass size={16} className={isActive ? 'animate-pulse' : ''} />
          </button>

          {/* Random Note Dice Icon */}
          <button
            onClick={handleRandomNote}
            className={styles.iconBtn}
            title="Open a random note"
          >
            <Dice5 size={16} />
          </button>

          {/* Floating Window Toggle Icon */}
          <button
            onClick={handleToggleFloating}
            className={styles.iconBtn}
            title="Toggle Quick Write Window"
          >
            <AppWindow size={16} />
          </button>
        </div>
      </header>

      {/* Main layout underneath full width header */}
      <div className={styles.mainLayout}>
        {/* Sidebar Panel (Pane 1) */}
        <Navigation 
          activeSection={activeSection} 
          onSectionSelect={setActiveSection} 
          index={index} 
          vaultPath={vaultPath} 
        />

        {/* Main Workspace content */}
        <main className={styles.main}>
          {/* Content Area */}
          <div className={styles.contentWrapper}>
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Break overlay block lock portal */}
      <TimerOverlay />
    </div>
  );
}


