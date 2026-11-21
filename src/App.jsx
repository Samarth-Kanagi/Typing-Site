import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { generatePassage } from './words';

const DEFAULT_TIME = 5; // 5 minutes default
const DEFAULT_DIFFICULTY = 'easy';

function wordCountForTime(minutes) {
  return Math.max(60, minutes * 40);
}

export default function App() {
  // ---------- State ----------
  const [textSource, setTextSource] = useState('random'); // 'random' | 'custom'
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [timeLimit, setTimeLimit] = useState(DEFAULT_TIME); // minutes (1 to 20)
  const [passage, setPassage] = useState('');
  const [typedChars, setTypedChars] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_TIME * 60); // seconds
  const [startTime, setStartTime] = useState(null);
  const [showIndicator, setShowIndicator] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showResultsPopup, setShowResultsPopup] = useState(false);
  const [customText, setCustomText] = useState('');
  const [history, setHistory] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null); // 'file' | 'settings' | 'help' | null
  const [darkMode, setDarkMode] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const passageRef = useRef(null);
  const typingBoxRef = useRef(null);
  const deadlineRef = useRef(null);
  const finishedRef = useRef(false);
  const sessionStartedRef = useRef(false);

  // ---------- Load session history from backend ----------
  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setHistory(data);
      })
      .catch(() => {});
  }, []);

  // ---------- Focus helper ----------
  const focusTyping = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // ---------- Reset test with explicit time limit support ----------
  const resetTest = useCallback((newText, explicitMins) => {
    const mins = explicitMins !== undefined ? explicitMins : timeLimit;
    setTypedChars('');
    setIsRunning(false);
    setIsFinished(false);
    setShowResultsPopup(false);
    setTimeLeft(mins * 60);
    setStartTime(null);
    deadlineRef.current = null;
    finishedRef.current = false;
    sessionStartedRef.current = false;
    clearInterval(timerRef.current);
    if (newText !== undefined) setPassage(newText);
    focusTyping();
  }, [timeLimit, focusTyping]);

  // ---------- Generate initial passage ----------
  useEffect(() => {
    const p = generatePassage(difficulty, wordCountForTime(timeLimit));
    setPassage(p);
    resetTest(p, timeLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleWindowClick = (e) => {
      if (!e.target.closest('.menu-item')) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  // ---------- Calculate statistics ----------
  const stats = useMemo(() => {
    let correct = 0;
    let errors = 0;

    for (let i = 0; i < typedChars.length; i++) {
      if (typedChars[i] === passage[i]) {
        correct++;
      } else {
        errors++;
      }
    }

    const elapsed = timeLimit * 60 - timeLeft;
    const minutes = elapsed > 0 ? elapsed / 60 : 0.001;

    const wpm = minutes > 0 ? Math.round((correct / 5) / minutes) : 0;
    const cpm = minutes > 0 ? Math.round(correct / minutes) : 0;
    const accuracy = typedChars.length > 0
      ? Math.round((correct / typedChars.length) * 100)
      : 100;

    const totalWords = passage ? passage.trim().split(/\s+/).length : 0;

    return {
      wpm,
      cpm,
      accuracy,
      errors,
      correct,
      totalTyped: typedChars.length,
      totalWords,
      elapsed: Math.max(1, elapsed),
    };
  }, [typedChars, passage, isRunning, isFinished, timeLimit, timeLeft]);

  // ---------- Finish test ----------
  const finishTest = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsRunning(false);
    setIsFinished(true);
    setShowResultsPopup(true);
    clearInterval(timerRef.current);

    const elapsed = Math.max(1, timeLimit * 60 - timeLeft);
    let correct = 0;
    let errors = 0;
    for (let i = 0; i < typedChars.length; i++) {
      if (typedChars[i] === passage[i]) correct++;
      else errors++;
    }
    const minutes = elapsed / 60;
    const wpm = minutes > 0 ? Math.round((correct / 5) / minutes) : 0;
    const cpm = minutes > 0 ? Math.round(correct / minutes) : 0;
    const accuracy = typedChars.length > 0
      ? Math.round((correct / typedChars.length) * 100)
      : 100;

    const record = {
      date: new Date().toISOString(),
      difficulty: textSource === 'custom' ? 'custom' : difficulty,
      timeLimit,
      elapsed,
      wpm,
      cpm,
      accuracy,
      errors,
      correct,
      totalTyped: typedChars.length,
    };

    fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setHistory(data);
      })
      .catch(() => {
        setHistory(prev => [record, ...prev]);
      });
  }, [typedChars, passage, timeLimit, timeLeft, textSource, difficulty]);

  // ---------- Timer countdown ----------
  useEffect(() => {
    if (isRunning && !isFinished) {
      if (!deadlineRef.current) deadlineRef.current = Date.now() + timeLeft * 1000;
      const update = () => {
        const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining === 0) finishTest();
      };
      update();
      timerRef.current = setInterval(update, 200);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, isFinished, finishTest]);

  // Complete if whole passage is typed (handles both random and custom text)
  useEffect(() => {
    if (passage && typedChars.length >= passage.length && isRunning) {
      finishTest();
    }
  }, [typedChars, passage, isRunning, finishTest]);

  // Auto-scroll typing box
  useEffect(() => {
    if (typingBoxRef.current) {
      const cursor = typingBoxRef.current.querySelector('.typing-cursor');
      if (cursor) {
        cursor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    if (passageRef.current && showIndicator) {
      const activeChar = passageRef.current.querySelector('.passage-char--active');
      if (activeChar) {
        activeChar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [typedChars, showIndicator]);

  // ---------- Keystroke handling ----------
  const handleKeyDown = useCallback((e) => {
    if (isFinished) return;

    // Start timer on first printable keypress
    const startsTest = !isRunning && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1;
    if (startsTest) {
      setIsRunning(true);
      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        setStartTime(Date.now());
        deadlineRef.current = Date.now() + timeLeft * 1000;
      } else if (!deadlineRef.current) {
        deadlineRef.current = Date.now() + timeLeft * 1000;
      }
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (startsTest && !sessionStartedRef.current) {
        sessionStartedRef.current = true;
        setStartTime(Date.now());
        deadlineRef.current = Date.now() + timeLeft * 1000;
      }
      setTypedChars(prev => prev.slice(0, -1));
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      // Start timer if this is the first keypress
      if (!isRunning) {
        setIsRunning(true);
        if (!sessionStartedRef.current) {
          sessionStartedRef.current = true;
          setStartTime(Date.now());
          deadlineRef.current = Date.now() + timeLeft * 1000;
        } else if (!deadlineRef.current) {
          deadlineRef.current = Date.now() + timeLeft * 1000;
        }
      }
      setTypedChars(prev => {
        if (prev.length >= passage.length) return prev;
        return prev + '\t';
      });
      return;
    }

    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key.length === 1) {
      e.preventDefault();
      setTypedChars(prev => {
        if (prev.length >= passage.length) return prev;
        return prev + e.key;
      });
    }
  }, [isRunning, isFinished, passage, timeLeft]);

  // ---------- Toolbar Handlers ----------
  const handleStartToggle = () => {
    if (isFinished) {
      resetTest(passage, timeLimit);
      return;
    }
    if (isRunning) {
      if (deadlineRef.current) {
        const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
        setTimeLeft(remaining);
        deadlineRef.current = null;
      }
      setIsRunning(false);
      clearInterval(timerRef.current);
    } else {
      if (!sessionStartedRef.current) {
        sessionStartedRef.current = true;
        setStartTime(Date.now());
      }
      deadlineRef.current = Date.now() + timeLeft * 1000;
      setIsRunning(true);
      if (!startTime) setStartTime(Date.now());
      focusTyping();
    }
  };

  const handleChangeDifficulty = (diff) => {
    setDifficulty(diff);
    setTextSource('random');
    const p = generatePassage(diff, wordCountForTime(timeLimit));
    setPassage(p);
    resetTest(p, timeLimit);
  };

  // Immediate time update bug fix: immediately updates state & timeLeft
  const handleChangeTime = (mins) => {
    const m = Math.min(20, Math.max(1, Number.parseInt(mins, 10) || DEFAULT_TIME));
    setTimeLimit(m);
    setTimeLeft(m * 60);

    if (textSource === 'random') {
      const p = generatePassage(difficulty, wordCountForTime(m));
      setPassage(p);
      resetTest(p, m);
    } else {
      resetTest(undefined, m);
    }
  };

  const handleTextSourceChange = (source) => {
    setTextSource(source);
    if (source === 'custom') {
      setShowCustomModal(true);
    } else {
      const p = generatePassage(difficulty, wordCountForTime(timeLimit));
      setPassage(p);
      resetTest(p, timeLimit);
    }
  };

  const handleCustomTextSubmit = () => {
    if (customText.length < 10) return;
    setTextSource('custom');
    setPassage(customText);
    resetTest(customText, timeLimit);
    setShowCustomModal(false);
    setCustomText('');
  };

  // Format time mm:ss
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Progress percentage for time bar
  const totalSeconds = timeLimit * 60;
  const elapsedSeconds = totalSeconds - timeLeft;
  const timeProgressPercent = Math.min(100, Math.max(0, (elapsedSeconds / totalSeconds) * 100));

  // Render typing stream:
  // - DURING TYPING: plain, uncolored text (NO red or green)
  // - AFTER PASSAGE IS OVER / COMPLETED: green for correct words, red for error words
  const renderedTyping = useMemo(() => {
    if (!typedChars) return null;

    // While typing (start to finish): DO NOT show red or green
    if (!isFinished) {
      return (
        <span className="typing-plain-text">
          {typedChars}
        </span>
      );
    }

    // After passage is over / completed: Show green (correct) and red (error) results
    const passageWords = passage.split(' ');
    const typedWords = typedChars.split(' ');

    return typedWords.map((typedWord, wordIdx) => {
      const expectedWord = passageWords[wordIdx] || '';
      const isWordCorrect = typedWord === expectedWord;

      return (
        <span
          key={wordIdx}
          className={`word-span ${isWordCorrect ? 'word--correct' : 'word--error'}`}
          title={!isWordCorrect ? `Expected: "${expectedWord}" | Typed: "${typedWord}"` : 'Correct'}
        >
          {typedWord}{wordIdx < typedWords.length - 1 ? ' ' : ''}
        </span>
      );
    });
  }, [typedChars, passage, isFinished]);

  return (
    <div className={`tp-desktop ${darkMode ? 'tp-dark' : ''}`}>
      {/* Hidden input capture for all typing */}
      <input
        ref={inputRef}
        type="text"
        className="tp-hidden-input"
        id="typing-input-listener"
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus
      />

      {/* Main Window */}
      <div className="tp-window" id="typing-practice-window">

        {/* 1. TITLEBAR */}
        <div className="tp-titlebar">
          <div className="tp-titlebar-left">
            <span className="tp-titlebar-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="2" width="18" height="20" rx="2" fill="#ffffff" />
                <path d="M7 6h10M7 10h10M7 14h6" stroke="#2b5b9c" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="tp-titlebar-text">Typing Practice</span>
          </div>
          <div className="tp-titlebar-controls">
            <button className="tp-win-btn" title="Minimize">_</button>
            <button className="tp-win-btn" title="Maximize">□</button>
            <button className="tp-win-btn tp-win-btn--close" title="Close">✕</button>
          </div>
        </div>

        {/* 2. MENU BAR */}
        <div className="tp-menubar">
          <div className="menu-item">
            <button
              className="menu-button"
              onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className="menu-dropdown">
                <div className="menu-dropdown-item" onClick={() => { handleChangeDifficulty(difficulty); setActiveMenu(null); }}>
                  New Random Passage
                </div>
                <div className="menu-dropdown-item" onClick={() => { setShowCustomModal(true); setActiveMenu(null); }}>
                  Paste Custom Text...
                </div>
                <div className="menu-dropdown-divider" />
                <div className="menu-dropdown-item" onClick={() => { setShowHistoryModal(true); setActiveMenu(null); }}>
                  Session History Log...
                </div>
                <div className="menu-dropdown-divider" />
                <div className="menu-dropdown-item" onClick={() => { resetTest(passage, timeLimit); setActiveMenu(null); }}>
                  Reset Current Test
                </div>
              </div>
            )}
          </div>

          <div className="menu-item">
            <button
              className="menu-button"
              onClick={() => setActiveMenu(activeMenu === 'settings' ? null : 'settings')}
            >
              Settings
            </button>
            {activeMenu === 'settings' && (
              <div className="menu-dropdown">
                <div
                  className="menu-dropdown-item"
                  onClick={() => {
                    setDarkMode(false);
                    setActiveMenu(null);
                  }}
                >
                  {!darkMode ? '✓ ' : '   '} Light Mode
                </div>
                <div
                  className="menu-dropdown-item"
                  onClick={() => {
                    setDarkMode(true);
                    setActiveMenu(null);
                  }}
                >
                  {darkMode ? '✓ ' : '   '} Dark Mode
                </div>
              </div>
            )}
          </div>

          <div className="menu-item">
            <button
              className="menu-button"
              onClick={() => setActiveMenu(activeMenu === 'help' ? null : 'help')}
            >
              Help
            </button>
            {activeMenu === 'help' && (
              <div className="menu-dropdown">
                <div className="menu-dropdown-item" onClick={() => { setShowHelpModal(true); setActiveMenu(null); }}>
                  About Typing Practice
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. TOOLBAR CONTROLS */}
        <div className="tp-toolbar">
          {/* Text Source */}
          <div className="tp-field-group">
            <label className="tp-field-label">Text Source</label>
            <select
              className="tp-select tp-select--source"
              value={textSource}
              onChange={e => handleTextSourceChange(e.target.value)}
            >
              <option value="random">Random Words</option>
              <option value="custom">Custom Text</option>
            </select>
          </div>

          {/* Difficulty */}
          <div className="tp-field-group">
            <label className="tp-field-label">Difficulty</label>
            <div className="tp-segmented-buttons">
              <button
                type="button"
                className={`tp-seg-btn ${difficulty === 'easy' && textSource === 'random' ? 'tp-seg-btn--active' : ''}`}
                onClick={() => handleChangeDifficulty('easy')}
              >
                Easy
              </button>
              <button
                type="button"
                className={`tp-seg-btn ${difficulty === 'medium' && textSource === 'random' ? 'tp-seg-btn--active' : ''}`}
                onClick={() => handleChangeDifficulty('medium')}
              >
                Medium
              </button>
              <button
                type="button"
                className={`tp-seg-btn ${difficulty === 'hard' && textSource === 'random' ? 'tp-seg-btn--active' : ''}`}
                onClick={() => handleChangeDifficulty('hard')}
              >
                Hard
              </button>
            </div>
          </div>

          {/* Time (minutes) */}
          <div className="tp-field-group">
            <label className="tp-field-label">Time (minutes)</label>
            <select
              className="tp-select tp-select--time"
              id="time-limit-selector"
              value={timeLimit}
              onChange={e => handleChangeTime(e.target.value)}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Start / Pause Button */}
          <div className="tp-field-group tp-field-group--btn">
            <button
              id="tp-btn-start"
              type="button"
              className={`tp-action-btn tp-btn--start ${isRunning ? 'tp-btn--running' : ''}`}
              onClick={handleStartToggle}
            >
              {isFinished ? 'New Test' : isRunning ? 'Pause' : 'Start'}
            </button>
          </div>

          {/* Reset Button */}
          <div className="tp-field-group tp-field-group--btn">
            <button
              id="tp-btn-reset"
              type="button"
              className="tp-action-btn tp-btn--reset"
              onClick={() => resetTest(passage, timeLimit)}
            >
              Reset
            </button>
          </div>

          {/* End Test Button – manually finish and show results */}
          <div className="tp-field-group tp-field-group--btn">
            <button
              id="tp-btn-end-test"
              type="button"
              className="tp-action-btn tp-btn--end"
              onClick={() => { if (isRunning || typedChars.length > 0) finishTest(); }}
              disabled={isFinished || (!isRunning && typedChars.length === 0)}
              title="End the test now and see your results"
            >
              End Test
            </button>
          </div>

          {/* Paste Custom Text Button */}
          <div className="tp-field-group tp-field-group--btn">
            <button
              id="tp-btn-paste-custom"
              type="button"
              className="tp-action-btn tp-btn--paste"
              onClick={() => { setCustomText(passage); setShowCustomModal(true); }}
            >
              Paste Custom Text
            </button>
          </div>

          {/* Indicator Enable/Disable Button */}
          <div className="tp-field-group tp-field-group--btn">
            <button
              id="tp-btn-toggle-indicator"
              type="button"
              className={`tp-action-btn tp-btn--indicator ${showIndicator ? 'tp-btn--indicator-on' : ''}`}
              onClick={() => setShowIndicator(prev => !prev)}
              title="Toggle character position highlight indicator"
            >
              Indicator: {showIndicator ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Timer – moved to toolbar, right-aligned */}
          <div className="tp-toolbar-timer">
            <span className="tp-toolbar-timer-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
            <span className="tp-toolbar-timer-val" id="val-time-remaining">
              {formatTime(timeLeft)}
            </span>
            <div className="tp-toolbar-timer-progress">
              <div
                className="tp-toolbar-timer-bar"
                style={{ width: `${timeProgressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 4. DUAL DOCUMENT PANES */}
        <div className="tp-panes-container">

          {/* LEFT PANE: Passage (Type this text) */}
          <div className="tp-pane tp-pane--passage" onClick={focusTyping}>
            <div className="tp-pane-header">
              <span className="tp-pane-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#4a76a8" />
                  <path d="M14 2v6h6" fill="#7ba3cc" />
                  <line x1="8" y1="12" x2="16" y2="12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <line x1="8" y1="16" x2="14" y2="16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="tp-pane-title">Passage (Type this text)</span>
            </div>
            <div
              ref={passageRef}
              className="tp-pane-content tp-passage-content"
              id="passage-text-display"
            >
              {passage.split('').map((char, i) => {
                const isCurrent = i === typedChars.length;
                let className = 'passage-char';
                if (showIndicator && isCurrent) {
                  className += ' passage-char--active';
                }
                return (
                  <span key={i} className={className} data-idx={i}>
                    {char}
                  </span>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANE: Your Typing (Type here) */}
          <div
            className={`tp-pane tp-pane--typing ${isFocused ? 'tp-pane--focused' : ''}`}
            onClick={focusTyping}
          >
            <div className="tp-pane-header">
              <span className="tp-pane-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#4a76a8" />
                  <path d="M14 2v6h6" fill="#7ba3cc" />
                  <line x1="8" y1="12" x2="16" y2="12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                  <line x1="8" y1="16" x2="14" y2="16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="tp-pane-title">
                Your Typing (Type here)
                {isFinished && <span className="tp-pane-tag-finished"> — Finished Result</span>}
              </span>
            </div>
            <div
              ref={typingBoxRef}
              className="tp-pane-content tp-typing-content"
              id="typing-live-stream"
            >
              {renderedTyping}
              {/* Blinking typing cursor (only while typing, hidden after finish) */}
              {!isFinished && <span className="typing-cursor" />}
            </div>
          </div>

        </div>



      </div>

      {/* ================= MODAL: RESULTS POP-UP WINDOW ================= */}
      {/* Automatically appears upon passage completion, time over, or custom text completion */}
      {showResultsPopup && (
        <div className="tp-modal-backdrop" onClick={() => setShowResultsPopup(false)}>
          <div className="tp-dialog tp-dialog--results" onClick={e => e.stopPropagation()}>
            <div className="tp-dialog-titlebar">
              <span>Typing Practice - Practice Completed</span>
              <button className="tp-dialog-close" onClick={() => setShowResultsPopup(false)}>✕</button>
            </div>
            <div className="tp-dialog-content" style={{ textAlign: 'center' }}>
              <div className="tp-popup-banner">
                <div className="tp-popup-badge">
                  {stats.accuracy >= 95 ? '🏆 Excellent!' : stats.accuracy >= 80 ? '🎯 Great Job!' : '⚡ Finished!'}
                </div>
                <h2 style={{ color: '#1f2937', margin: '0.4rem 0 0.2rem', fontSize: '1.25rem' }}>
                  {timeLeft === 0 ? 'Time is Up!' : 'Passage Completed!'}
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '1rem' }}>
                  Your typing performance results have been saved to local session records.
                </p>
              </div>

              {/* Time elapsed */}
              <div className="tp-results-time-row">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Time: {formatTime(stats.elapsed)}
              </div>

              {/* 4 Performance Metric Cards in Popup */}
              <div className="tp-results-grid">
                <div className="tp-res-box">
                  <span className="tp-res-lbl">Speed</span>
                  <span className="tp-res-val" style={{ color: '#2563eb' }}>{stats.wpm}</span>
                  <span className="tp-res-sub">WPM</span>
                </div>
                <div className="tp-res-box">
                  <span className="tp-res-lbl">Characters</span>
                  <span className="tp-res-val">{stats.cpm}</span>
                  <span className="tp-res-sub">CPM</span>
                </div>
                <div className="tp-res-box">
                  <span className="tp-res-lbl">Accuracy</span>
                  <span className="tp-res-val" style={{ color: '#16a34a' }}>{stats.accuracy}%</span>
                  <span className="tp-res-sub">{stats.correct} correct</span>
                </div>
                <div className="tp-res-box">
                  <span className="tp-res-lbl">Errors</span>
                  <span className="tp-res-val" style={{ color: '#dc2626' }}>{stats.errors}</span>
                  <span className="tp-res-sub">mistakes</span>
                </div>
              </div>

              <div className="tp-popup-legend">
                <span>Tip: Click <strong>"Inspect Result"</strong> below to view your green (correct) and red (error) words in the typing pane.</span>
              </div>

              <div className="tp-dialog-footer" style={{ justifyContent: 'center', marginTop: '1.25rem', gap: '0.75rem' }}>
                <button
                  className="tp-dlg-btn tp-dlg-btn--primary"
                  onClick={() => setShowResultsPopup(false)}
                >
                  Inspect Result
                </button>
                <button
                  className="tp-dlg-btn"
                  onClick={() => {
                    resetTest(passage, timeLimit);
                  }}
                >
                  Try Again
                </button>
                <button
                  className="tp-dlg-btn"
                  onClick={() => {
                    const p = generatePassage(difficulty, wordCountForTime(timeLimit));
                    setPassage(p);
                    resetTest(p, timeLimit);
                  }}
                >
                  New Passage
                </button>
                <button
                  className="tp-dlg-btn"
                  onClick={() => setShowResultsPopup(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PASTE CUSTOM TEXT ================= */}
      {showCustomModal && (
        <div className="tp-modal-backdrop" onClick={() => setShowCustomModal(false)}>
          <div className="tp-dialog" onClick={e => e.stopPropagation()}>
            <div className="tp-dialog-titlebar">
              <span>Paste Custom Text - Typing Practice</span>
              <button className="tp-dialog-close" onClick={() => setShowCustomModal(false)}>✕</button>
            </div>
            <div className="tp-dialog-content">
              <p className="tp-dialog-desc">
                Paste or write your custom text passage below (minimum 10 characters). It will be loaded into the passage pane ready for typing practice:
              </p>
              <textarea
                className="tp-custom-textarea"
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Type or paste custom paragraph here..."
                rows={7}
                autoFocus
              />
              <div className="tp-dialog-footer">
                <span className="tp-char-count">{customText.length} characters</span>
                <div className="tp-dialog-btns">
                  <button className="tp-dlg-btn" onClick={() => setShowCustomModal(false)}>Cancel</button>
                  <button
                    className="tp-dlg-btn tp-dlg-btn--primary"
                    disabled={customText.length < 10}
                    onClick={handleCustomTextSubmit}
                  >
                    Load & Practice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SESSION HISTORY ================= */}
      {showHistoryModal && (
        <div className="tp-modal-backdrop" onClick={() => setShowHistoryModal(false)}>
          <div className="tp-dialog tp-dialog--history" onClick={e => e.stopPropagation()}>
            <div className="tp-dialog-titlebar">
              <span>Session History Log ({history.length} records)</span>
              <button className="tp-dialog-close" onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            <div className="tp-dialog-content">
              {history.length === 0 ? (
                <p className="tp-empty-msg">No test records stored in <code>server/data/history.json</code> yet.</p>
              ) : (
                <div className="tp-history-table-wrap">
                  <table className="tp-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Difficulty</th>
                        <th>WPM</th>
                        <th>CPM</th>
                        <th>Accuracy</th>
                        <th>Errors</th>
                        <th>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 20).map((h, i) => (
                        <tr key={i}>
                          <td>{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                          <td><span className={`tp-history-badge tp-history-badge--${h.difficulty}`}>{h.difficulty}</span></td>
                          <td><strong>{h.wpm}</strong></td>
                          <td>{h.cpm}</td>
                          <td style={{ color: '#16a34a' }}>{h.accuracy}%</td>
                          <td style={{ color: h.errors > 0 ? '#dc2626' : '#16a34a' }}>{h.errors}</td>
                          <td>{formatTime(h.elapsed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="tp-dialog-footer" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button className="tp-dlg-btn" onClick={() => setShowHistoryModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: HELP ================= */}
      {showHelpModal && (
        <div className="tp-modal-backdrop" onClick={() => setShowHelpModal(false)}>
          <div className="tp-dialog" onClick={e => e.stopPropagation()}>
            <div className="tp-dialog-titlebar">
              <span>About Typing Practice</span>
              <button className="tp-dialog-close" onClick={() => setShowHelpModal(false)}>✕</button>
            </div>
            <div className="tp-dialog-content">
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Typing Practice Platform</h3>
              <p style={{ fontSize: '0.85rem', color: '#374151', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                A desktop-styled typing practice platform designed for precision speed and accuracy training.
              </p>
              <ul style={{ fontSize: '0.82rem', color: '#4b5563', paddingLeft: '1.25rem', lineHeight: '1.6' }}>
                <li><strong>Plain text while typing:</strong> Text stays clean without color distractions.</li>
                <li><strong>Green & Red on Finish:</strong> Correct words turn green and typos turn red once the test ends.</li>
                <li><strong>Results Pop-up:</strong> Final WPM, CPM, Errors, and Accuracy reveal in a results window upon completion.</li>
                <li><strong>Selectable Timer:</strong> Choose 1 to 20 minutes with immediate clock update.</li>
              </ul>
              <div className="tp-dialog-footer" style={{ marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                <button className="tp-dlg-btn tp-dlg-btn--primary" onClick={() => setShowHelpModal(false)}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
