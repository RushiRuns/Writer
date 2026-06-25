import React, { useState, useEffect, useRef } from 'react';

interface Document {
  id: string;
  title: string;
  content: string;
  category: string;
}

const DEFAULT_DOCUMENTS: Document[] = [
  {
    id: '1',
    title: 'The Whispering Pines - Chapter 1',
    content: 'The wind had a bite to it that night, carries the scent of damp loam and crushed pine needles. Jeremy pulled his wool collar higher around his throat, his eyes scanning the narrow path ahead. The old lantern in his hand sputtered, casting erratic, dancing shadows against the ancient trees.\n\n"I shouldn\'t be here," he muttered to himself, but the weight of the brass key in his pocket was a heavy reminder of the promise he\'d made. It was a key to a door that hadn\'t been opened in forty years. A door that lay deep within the heart of the forest, where the whispers were said to grow loudest.',
    category: 'Novel'
  },
  {
    id: '2',
    title: 'Product Launch Pitch',
    content: 'Every writer has felt the crushing weight of the blank page. We stare at the blinking cursor, waiting for inspiration that sometimes refuses to show up. \n\nThat is why we built Wrriter. It isn\'t just a word processor; it is an extension of your creative mind. Wrriter pairs a distraction-free typing experience with a context-aware AI writing assistant designed to polish your tone, suggest the next sentence, and help you hit your daily goals. Welcome to the future of creative flow.',
    category: 'Professional'
  },
  {
    id: '3',
    title: 'Metamorphosis (Poem)',
    content: 'Beneath the obsidian sky,\nwe shed the skins of yesterday.\nLike moths drawn to a fading flame,\nwe find ourselves in ash,\nand rise, anew,\nin violet light.',
    category: 'Poetry'
  }
];

export default function App() {
  const [documents, setDocuments] = useState<Document[]>(DEFAULT_DOCUMENTS);
  const [activeDocId, setActiveDocId] = useState<string>('1');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [aiPanelOpen, setAiPanelOpen] = useState<boolean>(true);
  const [aiOutput, setAiOutput] = useState<string>('');
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [wordGoal, setWordGoal] = useState<number>(300);

  const activeDoc = documents.find((doc) => doc.id === activeDocId) || documents[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Audio Context for mechanical keyboard sounds
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Generate a subtle organic click sound using oscillators
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Vary frequency slightly to sound less robotic
      const baseFreq = 800 + Math.random() * 200;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.015, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio click failed', e);
    }
  };

  // Set initial theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Handle keypress click sound
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Exclude modifier keys
    if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key !== 'Shift') {
      playClickSound();
    }
  };

  const handleContentChange = (newContent: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === activeDocId ? { ...doc, content: newContent } : doc))
    );
  };

  const handleTitleChange = (newTitle: string) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === activeDocId ? { ...doc, title: newTitle } : doc))
    );
  };

  const createNewDocument = () => {
    const newDoc: Document = {
      id: Date.now().toString(),
      title: 'Untitled Draft',
      content: '',
      category: 'General'
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
  };

  const deleteDocument = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (documents.length <= 1) return;
    const remaining = documents.filter((doc) => doc.id !== id);
    setDocuments(remaining);
    if (activeDocId === id) {
      setActiveDocId(remaining[0].id);
    }
  };

  // Helper stats
  const wordCount = activeDoc.content.trim() ? activeDoc.content.trim().split(/\s+/).length : 0;
  const charCount = activeDoc.content.length;
  const readingTime = Math.ceil(wordCount / 225); // average speed ~225 wpm
  
  // Custom simple readability calculation
  const getReadability = () => {
    if (wordCount < 5) return 'N/A';
    const sentences = activeDoc.content.split(/[.!?]+/).filter(Boolean).length || 1;
    const avgSentenceLength = wordCount / sentences;
    if (avgSentenceLength < 10) return 'Easy';
    if (avgSentenceLength < 18) return 'Moderate';
    return 'Challenging';
  };

  // Calculate goal percentage
  const goalProgress = Math.min(Math.round((wordCount / wordGoal) * 100), 100);

  // Markdown format helpers
  const applyFormat = (syntax: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = activeDoc.content;

    const selectedText = text.substring(start, end);
    let replacement = '';

    if (syntax === 'h1') {
      replacement = `\n# ${selectedText}`;
    } else if (syntax === 'h2') {
      replacement = `\n## ${selectedText}`;
    } else {
      replacement = `${syntax}${selectedText}${syntax}`;
    }

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    handleContentChange(newContent);

    // Reset cursor selection
    setTimeout(() => {
      textarea.focus();
      const offset = replacement.length - selectedText.length;
      textarea.setSelectionRange(start, end + offset);
    }, 50);
  };

  // Simulated AI actions with beautiful streaming typewriters
  const runAiCommand = (action: string) => {
    if (isAiTyping) return;
    setIsAiTyping(true);
    setAiOutput('');

    let promptResult = '';

    if (action === 'spark') {
      promptResult = `Here are three creative directions you could take with this text:\n\n1. Introduce a sudden change in atmosphere—perhaps Jeremy hears a metallic chime underneath the wind.\n2. Zoom in on the brass key—describe the elaborate engravings and cold, heavy feel of it.\n3. Create tension with a flash-back. Reveal what promise he made and to whom, creating immediate stakes.`;
    } else if (action === 'tone') {
      promptResult = `Here is a polished version in a more atmospheric, literary tone:\n\n"The dusk held a bitter chill, freighted with the heavy perfumes of damp earth and crushed conifers. High collar raised, Jeremy followed the faint trace of the path. In his trembling grip, the brass key felt less like a promise and more like a sentence."`;
    } else if (action === 'flow') {
      promptResult = `Flow Analysis:\n\n- Good hook: Starts with active sensory detail ("damp loam and crushed pine").\n- Sentence Variety: Mix of longer descriptive sentences and shorter interior thoughts.\n- Suggestion: Consider breaking down the second paragraph into two smaller ones to slow down the reader and amplify the quiet suspense.`;
    } else if (action === 'grammar') {
      promptResult = `Grammar Check Summary:\n\n- Fix: "carries the scent" -> "carrying the scent" or "which carried the scent" to maintain correct participle structure.\n- Overall spelling: 100% correct.\n- Style tip: Use a stronger verb than "had a bite" (e.g., "The wind bit sharply that night").`;
    }

    let currentIndex = 0;
    const interval = setInterval(() => {
      setAiOutput((prev) => prev + promptResult[currentIndex]);
      currentIndex++;
      if (currentIndex >= promptResult.length) {
        clearInterval(interval);
        setIsAiTyping(false);
      }
    }, 15);
  };

  return (
    <div className="app-container">
      {/* Decorative Orbs */}
      <div className="bg-glow-orb-1"></div>
      <div className="bg-glow-orb-2"></div>

      {/* Sidebar Panel */}
      <aside className="sidebar glass-panel">
        <div className="logo-container">
          <div className="logo-icon">W</div>
          <span className="logo-text">Wrriter</span>
        </div>

        <button className="btn-primary" style={{ marginBottom: '1.5rem' }} onClick={createNewDocument}>
          <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Draft
        </button>

        <h3 className="sidebar-section-title">Documents</h3>
        <ul className="sidebar-list">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className={`sidebar-item ${doc.id === activeDocId ? 'active' : ''}`}
              onClick={() => setActiveDocId(doc.id)}
            >
              <div className="sidebar-item-label">
                <svg
                  style={{ width: '16px', height: '16px', opacity: 0.7 }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {doc.title || 'Untitled'}
              </div>
              <button
                className="icon-button"
                onClick={(e) => deleteDocument(doc.id, e)}
                style={{ visibility: documents.length > 1 ? 'visible' : 'hidden' }}
              >
                <svg style={{ width: '14px', height: '14px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>

        {/* Goal Section */}
        <div style={{ marginTop: 'auto' }}>
          <h3 className="sidebar-section-title">Writing Goal</h3>
          <div className="glass-card goal-container">
            <div className="goal-header">
              <span>Goal Progress</span>
              <span>{goalProgress}%</span>
            </div>
            <div className="goal-progress-track">
              <div className="goal-progress-bar" style={{ width: `${goalProgress}%` }}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>{wordCount} words</span>
              <span>Target: {wordGoal} w</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={wordGoal}
                onChange={(e) => setWordGoal(Number(e.target.value))}
                style={{ flexGrow: 1, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-workspace">
        <div className="editor-container">
          <div className="editor-inner animate-fade-in">
            {/* Header Title Area */}
            <div className="editor-header">
              <input
                type="text"
                className="title-input"
                value={activeDoc.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Document Title"
              />
              <button
                className="btn-secondary"
                onClick={() => setAiPanelOpen(!aiPanelOpen)}
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
              >
                <svg
                  style={{ width: '14px', height: '14px', marginRight: '0.25rem' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {aiPanelOpen ? 'Hide AI' : 'Show AI'}
              </button>
            </div>

            {/* Markdown Helper Formatting Toolbar */}
            <div className="format-toolbar">
              <button className="toolbar-btn" onClick={() => applyFormat('**')} title="Bold">
                B
              </button>
              <button className="toolbar-btn" style={{ fontStyle: 'italic' }} onClick={() => applyFormat('*')} title="Italic">
                I
              </button>
              <button className="toolbar-btn" style={{ textDecoration: 'underline' }} onClick={() => applyFormat('__')} title="Underline">
                U
              </button>
              <div className="toolbar-divider"></div>
              <button className="toolbar-btn" onClick={() => applyFormat('h1')} title="Heading 1">
                H1
              </button>
              <button className="toolbar-btn" onClick={() => applyFormat('h2')} title="Heading 2">
                H2
              </button>
              <div className="toolbar-divider"></div>
              <button className="toolbar-btn" onClick={() => applyFormat('`')} title="Monospace">
                &lt;&gt;
              </button>
            </div>

            {/* Typing Editor */}
            <textarea
              ref={textareaRef}
              className="text-editor-textarea"
              value={activeDoc.content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Begin pouring your thoughts here..."
            />
          </div>
        </div>

        {/* Footer Stats Bar */}
        <footer className="status-bar">
          <div className="status-stats">
            <div className="status-stat-item">
              Words: <span className="status-stat-val">{wordCount}</span>
            </div>
            <div className="status-stat-item">
              Characters: <span className="status-stat-val">{charCount}</span>
            </div>
            <div className="status-stat-item">
              Read Time: <span className="status-stat-val">{readingTime} min</span>
            </div>
            <div className="status-stat-item">
              Readability: <span className="status-stat-val">{getReadability()}</span>
            </div>
          </div>

          <div className="status-actions">
            {/* Audio Toggle */}
            <button
              className={`icon-button sound-toggle-btn ${soundEnabled ? 'active' : ''}`}
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Typing Click' : 'Enable Typing Click'}
            >
              {soundEnabled ? (
                <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              ) : (
                <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zm11.364-5.636L14.343 12l2.607 2.636m0-5.272L19.557 12l-2.607-2.636"
                  />
                </svg>
              )}
            </button>

            {/* Theme Toggle */}
            <button
              className="icon-button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? (
                <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
                  />
                </svg>
              ) : (
                <svg style={{ width: '16px', height: '16px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
          </div>
        </footer>
      </main>

      {/* AI Assistant Right Sidebar Panel */}
      <aside className={`ai-panel ${aiPanelOpen ? '' : 'collapsed'}`}>
        <div className="ai-header">
          <div className="ai-title">
            <svg style={{ width: '18px', height: '18px', color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Writer AI</span>
          </div>
          <span className="ai-badge">Creative</span>
        </div>

        {/* AI Action Options */}
        <div className="ai-card">
          <div className="ai-card-title">Brainstorm & Spark Ideas</div>
          <div className="ai-card-desc">Need inspiration? Generate plot points, outline details, or imagery references.</div>
          <button className="btn-primary" onClick={() => runAiCommand('spark')} disabled={isAiTyping}>
            Spark ideas
          </button>
        </div>

        <div className="ai-card">
          <div className="ai-card-title">Elevate Tone & Style</div>
          <div className="ai-card-desc">Transform selected paragraph into beautiful, highly descriptive prose.</div>
          <button className="btn-primary" onClick={() => runAiCommand('tone')} disabled={isAiTyping}>
            Polish prose
          </button>
        </div>

        <div className="ai-card">
          <div className="ai-card-title">Flow & Structure Audit</div>
          <div className="ai-card-desc">Review pacing, sentence structure, and flow suggestions.</div>
          <button className="btn-secondary" onClick={() => runAiCommand('flow')} disabled={isAiTyping}>
            Audit pacing
          </button>
        </div>

        <div className="ai-card">
          <div className="ai-card-title">Smart Grammar Check</div>
          <div className="ai-card-desc">Examine spelling, participle forms, and stylistic quirks.</div>
          <button className="btn-secondary" onClick={() => runAiCommand('grammar')} disabled={isAiTyping}>
            Check grammar
          </button>
        </div>

        {/* AI Output Stream Area */}
        <div className="ai-output-box">
          {aiOutput ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{aiOutput}</div>
          ) : (
            <div className="ai-output-empty">
              {isAiTyping ? 'Generating responses...' : 'Click an action above to evoke the AI assistant.'}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
