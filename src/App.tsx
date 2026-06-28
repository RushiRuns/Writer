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
import ListsView from './renderer/components/lists/ListsView';
import CommandPalette from './renderer/components/command-palette/CommandPalette';
import FloatingWindow from './renderer/components/floating-window/FloatingWindow';
import { VaultIndex } from './shared/ipc-types';
import { TimerProvider, useTimer } from './renderer/contexts/TimerContext';
import TimerOverlay from './renderer/components/timer/TimerOverlay';
import AudioManager from './renderer/components/ambient-sounds/AudioManager';
import SyncthingSettings from './renderer/components/settings/SyncthingSettings';
import HotkeysSettings from './renderer/components/settings/HotkeysSettings';
import EditorSettings from './renderer/components/settings/EditorSettings';
import VaultSettings from './renderer/components/settings/VaultSettings';
import BreakReminderSettings from './renderer/components/settings/BreakReminderSettings';
import ImportExportSettings from './renderer/components/settings/ImportExportSettings';
import NoteReminderSettings from './renderer/components/settings/NoteReminderSettings';
import {
  Cloud, CloudOff, RefreshCw, SunMoon, X,
  Palette, BookOpen, FolderOpen, Timer, Bell, Database, Keyboard, Wifi
} from 'lucide-react';
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
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<string>('appearance');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [breadcrumb, setBreadcrumb] = useState<string>('Inbox');
  const [currentNotePath, setCurrentNotePath] = useState<string | null>(null);
  const [index, setIndex] = useState<VaultIndex>({
    notes: [],
    tagMap: {},
    drawings: [],
    reminders: [],
    folders: []
  });
  const [targetNotePath, setTargetNotePath] = useState<string | null>(null);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  const handleRandomNote = () => {
    if (index.notes.length === 0) return;
    const randomIdx = Math.floor(Math.random() * index.notes.length);
    const note = index.notes[randomIdx];
    setActiveSection('notes');
    setTargetNotePath(note.path);
  };

  const handleToggleTheme = async () => {
    try {
      const settings = await (window as any).wrriter.getSettings();
      const nextTheme = settings.theme === 'light' ? 'dark' : 'light';
      await (window as any).wrriter.setSettings({ theme: nextTheme });
      document.documentElement.setAttribute('data-theme', nextTheme);
      setTheme(nextTheme);
    } catch (err) {
      console.error('Failed to toggle theme:', err);
    }
  };

  const handleSetTheme = async (t: 'dark' | 'light') => {
    try {
      await (window as any).wrriter.setSettings({ theme: t });
      document.documentElement.setAttribute('data-theme', t);
      setTheme(t);
    } catch (err) {
      console.error('Failed to set theme:', err);
    }
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
      if (!(window as any).wrriter) return;
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
        if (!(window as any).wrriter) {
          setLoading(false);
          return;
        }
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
      if (!(window as any).wrriter) return;
      try {
        const settings = await (window as any).wrriter.getSettings();
        if (settings && settings.theme) {
          document.documentElement.setAttribute('data-theme', settings.theme);
          setTheme(settings.theme as 'dark' | 'light');
        }
      } catch (err) {
        console.error('Failed to load theme on mount:', err);
      }
    };
    loadTheme();
  }, []);

  // Handle global command palette actions
  useEffect(() => {
    if (!(window as any).wrriter) return;
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
        handleToggleTheme();
      } else if (action.startsWith('switch-')) {
        const targetSection = action.replace('switch-', '');
        if (targetSection === 'settings') {
          setShowSettings(true);
        } else {
          setActiveSection(targetSection);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen for Escape key to close Settings Modal
  useEffect(() => {
    if (!showSettings) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettings(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSettings]);

  useEffect(() => {
    if (vaultPath && appMode === 'main') {
      // Fetch initial index
      const fetchIndex = async () => {
        if (!(window as any).wrriter) return;
        try {
          const idx = await (window as any).wrriter.getVaultIndex();
          setIndex(idx);
        } catch (err) {
          console.error('Failed to fetch initial vault index:', err);
        }
      };
      fetchIndex();

      if (!(window as any).wrriter) return;
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
        return (
          <ListsView
            activeList={activeSection}
            onSelectList={setActiveSection}
            index={index}
            vaultPath={vaultPath}
          />
        );
      case 'tasks':
        return (
          <ChecklistView
            sectionId={activeSection}
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
            onNoteSelected={setCurrentNotePath}
            targetNotePath={targetNotePath} 
            onClearTargetNotePath={() => setTargetNotePath(null)}
            isZenMode={isZenMode}
            onToggleZenMode={() => setIsZenMode(!isZenMode)}
          />
        );
      case 'drawing':
        return <DrawingView index={index} _vaultPath={vaultPath} />;
      case 'journal':
        return (
          <JournalView 
            index={index} 
            vaultPath={vaultPath} 
            isZenMode={isZenMode}
            onToggleZenMode={() => setIsZenMode(!isZenMode)}
          />
        );
      case 'tags':
        return <TagsView index={index} vaultPath={vaultPath} />;
      case 'archive':
        return <ArchiveView index={index} vaultPath={vaultPath} />;
      case 'settings':
        return null;
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
      {!isZenMode && (
        <Navigation 
          activeSection={activeSection} 
          onSectionSelect={setActiveSection} 
          isSettingsOpen={showSettings}
          onSettingsClick={() => setShowSettings(true)}
        />
      )}

      {/* Main Workspace content */}
      <main className={styles.main}>
        {renderContent()}
      </main>

      {/* Break overlay block lock portal */}
      <TimerOverlay />

      {/* Settings Modal — left-tab sidebar layout */}
      {showSettings && (
        <div className={styles.modalBackdrop} onClick={() => setShowSettings(false)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Settings</h2>
              <button className={styles.modalCloseBtn} onClick={() => setShowSettings(false)}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body: sidebar + panel */}
            <div className={styles.modalBody}>

              {/* Left sidebar navigation */}
              <nav className={styles.modalSidebar}>
                <span className={styles.modalSidebarSection}>Appearance</span>
                <SidebarTab id="appearance" label="Theme" icon={<SunMoon size={13} />}
                  active={settingsTab} onClick={setSettingsTab} />
                <SidebarTab id="editor" label="Editor" icon={<BookOpen size={13} />}
                  active={settingsTab} onClick={setSettingsTab} />

                <div className={styles.modalSidebarDivider} />
                <span className={styles.modalSidebarSection}>Workspace</span>
                <SidebarTab id="vault" label="Vault" icon={<FolderOpen size={13} />}
                  active={settingsTab} onClick={setSettingsTab} />
                <SidebarTab id="timer" label="Timer" icon={<Timer size={13} />}
                  active={settingsTab} onClick={setSettingsTab} />
                <SidebarTab id="reminders" label="Reminders" icon={<Bell size={13} />}
                  active={settingsTab} onClick={setSettingsTab} />
                <SidebarTab id="data" label="Data" icon={<Database size={13} />}
                  active={settingsTab} onClick={setSettingsTab} />

                <div className={styles.modalSidebarDivider} />
                <span className={styles.modalSidebarSection}>System</span>
                <SidebarTab id="shortcuts" label="Shortcuts" icon={<Keyboard size={13} />}
                  active={settingsTab} onClick={setSettingsTab} />
                <SidebarTab id="syncthing" label="Syncthing" icon={<Wifi size={13} />}
                  active={settingsTab} onClick={setSettingsTab} />
              </nav>

              {/* Right panel content */}
              <div className={styles.modalPanelScroll}>

                {/* ── Appearance ── */}
                {settingsTab === 'appearance' && (
                  <>
                    <p className={styles.modalPanelTitle}>Appearance</p>

                    {/* Theme */}
                    <div className={styles.settingsCard}>
                      <div className={styles.settingsCardHeader}>
                        <SunMoon size={15} className={styles.appearanceIcon} />
                        <h3 className={styles.settingsCardTitle}>Application Theme</h3>
                      </div>
                      <div className={styles.settingsRow}>
                        <div className={styles.settingsRowText}>
                          <span className={styles.settingsLabel}>Color Mode</span>
                          <span className={styles.settingsDescription}>
                            Switch between Light and Dark interface styles.
                          </span>
                        </div>
                        <div className={styles.themeToggleGroup}>
                          <button
                            onClick={() => handleSetTheme('dark')}
                            className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeBtnActive : ''}`}
                          >
                            Dark
                          </button>
                          <button
                            onClick={() => handleSetTheme('light')}
                            className={`${styles.themeBtn} ${theme === 'light' ? styles.themeBtnActive : ''}`}
                          >
                            Light
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Syncthing Status card */}
                    <div className={styles.settingsCard} style={{ marginTop: '1rem' }}>
                      <div className={styles.settingsCardHeader}>
                        {syncthingStatus.status === 'disconnected' ? (
                          <CloudOff size={15} className={styles.statusIconDisconnected} />
                        ) : (
                          <Cloud size={15} className={syncthingStatus.status === 'synced' ? styles.statusIconSynced : styles.statusIconSyncing} />
                        )}
                        <h3 className={styles.settingsCardTitle}>Syncthing Status</h3>
                      </div>
                      <div className={styles.settingsRow}>
                        <div className={styles.settingsRowText}>
                          <div className={styles.settingsLabel}>
                            Status: <span className={
                              syncthingStatus.status === 'synced'
                                ? styles.stateSynced
                                : syncthingStatus.status === 'syncing'
                                  ? styles.stateSyncing
                                  : styles.stateDisconnected
                            }>{syncthingStatus.status}</span>
                          </div>
                          {syncthingStatus.status !== 'disconnected' && (
                            <span className={styles.settingsDescription}>
                              Device: {syncthingStatus.deviceName || 'Unknown'} | Connected: {syncthingStatus.connectedDevices} | Version: {syncthingStatus.version || 'N/A'}
                            </span>
                          )}
                          {syncthingStatus.status === 'disconnected' && (
                            <span className={styles.settingsDescription}>
                              Daemon offline or configuration error.
                            </span>
                          )}
                        </div>
                        <button onClick={handleSyncScan} className={styles.themeToggleBtn}>
                          <RefreshCw size={14} className={syncthingStatus.status === 'syncing' ? 'animate-spin' : ''} />
                          <span>Scan Now</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── Editor ── */}
                {settingsTab === 'editor' && (
                  <>
                    <p className={styles.modalPanelTitle}>Editor & Appearance</p>
                    <EditorSettings />
                  </>
                )}

                {/* ── Vault ── */}
                {settingsTab === 'vault' && (
                  <>
                    <p className={styles.modalPanelTitle}>Vault Directory</p>
                    <VaultSettings />
                  </>
                )}

                {/* ── Timer ── */}
                {settingsTab === 'timer' && (
                  <>
                    <p className={styles.modalPanelTitle}>Break Reminders</p>
                    <BreakReminderSettings />
                  </>
                )}

                {/* ── Note Reminders ── */}
                {settingsTab === 'reminders' && (
                  <>
                    <p className={styles.modalPanelTitle}>Note Reminders</p>
                    <NoteReminderSettings
                      index={index}
                      onNavigateNote={(path) => {
                        setShowSettings(false);
                        setActiveSection('notes');
                        setTargetNotePath(path);
                      }}
                    />
                  </>
                )}

                {/* ── Import & Export ── */}
                {settingsTab === 'data' && (
                  <>
                    <p className={styles.modalPanelTitle}>Import & Export</p>
                    <ImportExportSettings currentNotePath={currentNotePath} />
                  </>
                )}

                {/* ── Shortcuts ── */}
                {settingsTab === 'shortcuts' && (
                  <>
                    <p className={styles.modalPanelTitle}>Keyboard Shortcuts</p>
                    <HotkeysSettings />
                  </>
                )}

                {/* ── Syncthing config ── */}
                {settingsTab === 'syncthing' && (
                  <>
                    <p className={styles.modalPanelTitle}>Syncthing Integration</p>
                    <SyncthingSettings />
                  </>
                )}

              </div>{/* end panel */}
            </div>{/* end body */}
          </div>{/* end container */}
        </div>
      )}
    </div>
  );
}

// ── Sidebar Tab helper ──────────────────────────────────────────────────────
interface SidebarTabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: string;
  onClick: (id: string) => void;
}

function SidebarTab({ id, label, icon, active, onClick }: SidebarTabProps) {
  return (
    <button
      className={`${styles.modalSidebarTab} ${active === id ? styles.modalSidebarTabActive : ''}`}
      onClick={() => onClick(id)}
    >
      <span className={styles.modalSidebarTabIcon}>{icon}</span>
      {label}
    </button>
  );
}
