import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Check, X, Undo2, 
  GripHorizontal, Copy, CheckCircle, 
  ChevronRight, ChevronLeft, Save, History, 
  LogIn, LogOut, Settings, RefreshCw, 
  Github, Info, Pencil, Trash2 } from 'lucide-react';
import { diffWords } from 'diff';
import { supabase } from './supabase';

type DiffPart = {
  value: string;
  added?: boolean;
  removed?: boolean;
  decided?: boolean;
};

type Decision = {
  index: number;
  approved: boolean;
  diff: DiffPart;
};

type Comparison = {
  id: string;
  title: string;
  original_text: string;
  modified_text: string;
  final_text: string;
  created_at: string;
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSimpleMode, setIsSimpleMode] = useState(false);
  const [text1, setText1] = useState('');
  const [text2, setText2] = useState('');
  const [differences, setDifferences] = useState<DiffPart[]>([]);
  const [finalText, setFinalText] = useState('');
  const [decisions, setDecisions] = useState<Decision[]>([]);

  const [isFinalTextFocused, setIsFinalTextFocused] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [saveTitle, setSaveTitle] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isIntuitiveModeActive, setIsIntuitiveModeActive] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [hoveredComparisonId, setHoveredComparisonId] = useState<string | null>(null);
  const [editingComparisonId, setEditingComparisonId] = useState<string | null>(null);
  const [editingComparisonTitle, setEditingComparisonTitle] = useState('');

  const [repeatedWordsText1, setRepeatedWordsText1] = useState<{
    [word: string]: number;
  }>({});
  const [repeatedWordsText2, setRepeatedWordsText2] = useState<{
    [word: string]: number;
  }>({});
  const [repeatedWordsFinalText, setRepeatedWordsFinalText] = useState<{
    [word: string]: number;
  }>({});
  const [charThreshold, setCharThreshold] = useState(4);
  const [repetitionThreshold, setRepetitionThreshold] = useState(2);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showRepeatedWords, setShowRepeatedWords] = useState(false);

  const finalTextRef = useRef<HTMLDivElement>(null);
  


  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state change:', _event, session);
      setUser(session?.user ?? null);
      setIsUserLoaded(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && showHistory) {
      loadComparisons();
    }
  }, [user, showHistory]);

  const loadComparisons = async () => {
    const { data, error } = await supabase
      .from('comparisons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading comparisons:', error);
      return;
    }

    setComparisons(data);
  };

  const handleSave = async () => {
    if (!user) {
      alert('Please sign in to save comparisons');
      return;
    }

    if (!text1 || !text2) {
      alert('Please enter both original and modified text');
      return;
    }

    setShowSaveDialog(true);
  };

  const handleSaveConfirm = async () => {
    const { error } = await supabase.from('comparisons').insert({
      user_id: user.id,
      original_text: text1,
      modified_text: text2,
      final_text: finalTextRef.current?.textContent || '',
      title: saveTitle || 'Untitled Comparison',
    });

    if (error) {
      console.error('Error saving comparison:', error);
      alert('Failed to save comparison');
    } else {
      setShowSaveDialog(false);
      setSaveTitle('');
      if (showHistory) {
        loadComparisons();
      }
    }
  };

  const handleLoadComparison = (comparison: Comparison) => {
    setText1(comparison.original_text);
    setText2(comparison.modified_text);
    setShowHistory(false);
    handleCompare();
  };

  const handleDeleteComparison = async (e: React.MouseEvent, comparisonId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this comparison?')) {
      const { error } = await supabase
        .from('comparisons')
        .delete()
        .eq('id', comparisonId);

      if (error) {
        console.error('Error deleting comparison:', error);
        alert('Failed to delete comparison');
      } else {
        loadComparisons();
      }
    }
  };

  const handleStartRenameComparison = (e: React.MouseEvent, comparison: Comparison) => {
    e.stopPropagation();
    setEditingComparisonId(comparison.id);
    setEditingComparisonTitle(comparison.title);
  };

  const handleRenameComparison = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComparisonId) return;

    const { error } = await supabase
      .from('comparisons')
      .update({ title: editingComparisonTitle })
      .eq('id', editingComparisonId);

    if (error) {
      console.error('Error renaming comparison:', error);
      alert('Failed to rename comparison');
    } else {
      setEditingComparisonId(null);
      loadComparisons();
    }
  };

  const handleLogin = async () => {
    setIsSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('Error logging in:', error);
        alert('Failed to log in');
      } else if (data) {
        console.log('Sign in data: ', data);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      alert('Failed to log out');
    }
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-scrollbar');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-scrollbar');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const styleElement = document.createElement('style');

    styleElement.textContent = `
      .dark-scrollbar::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }

      .dark-scrollbar::-webkit-scrollbar-track {
        background: #2d3748;
      }

      .dark-scrollbar::-webkit-scrollbar-thumb {
        background: #4a5568;
        border-radius: 5px;
      }

      .dark-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #718096;
      }

      .dark-scrollbar textarea,
      .dark-scrollbar div[contentEditable=true],
      .dark-scrollbar .overflow-y-auto {
        scrollbar-color: #4a5568 #2d3748;
        scrollbar-width: thin;
      }

      .glass-button-light {
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .glass-button-dark {
        background: rgba(30, 41, 59, 0.5);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(71, 85, 105, 0.3);
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.25), 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      .glass-button-blue {
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.7), rgba(37, 99, 235, 0.5));
        backdrop-filter: blur(10px);
        border: 1px solid rgba(59, 130, 246, 0.5);
        box-shadow: 0 4px 6px rgba(37, 99, 235, 0.25), 0 1px 3px rgba(37, 99, 235, 0.15);
      }

      .glass-button-green {
        background: linear-gradient(135deg, rgba(22, 163, 74, 0.7), rgba(22, 163, 74, 0.5));
        backdrop-filter: blur(10px);
        border: 1px solid rgba(34, 197, 94, 0.5);
        box-shadow: 0 4px 6px rgba(22, 163, 74, 0.25), 0 1px 3px rgba(22, 163, 74, 0.15);
      }

      .glass-button-red {
        background: linear-gradient(135deg, rgba(220, 38, 38, 0.7), rgba(220, 38, 38, 0.5));
        backdrop-filter: blur(10px);
        border: 1px solid rgba(248, 113, 113, 0.5);
        box-shadow: 0 4px 6px rgba(220, 38, 38, 0.25), 0 1px 3px rgba(220, 38, 38, 0.15);
      }
    `;

    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, [isDarkMode]);

  useEffect(() => {
    if (!isSimpleMode && finalTextRef.current) {
      const spans = finalTextRef.current.querySelectorAll('span');

      spans.forEach((span) => {
        const type = span.dataset.type;
        const index = parseInt(span.dataset.index || '-1');
        const diff = differences[index];

        if (diff && !diff.decided) {
          if (type === 'added') {
            span.className = isDarkMode
              ? 'bg-green-900/100 px-1 rounded'
              : 'bg-green-200 px-1 rounded';
          } else if (type === 'removed') {
            span.className = isDarkMode
              ? 'bg-red-900/100 px-1 rounded'
              : 'bg-red-200 px-1 rounded';
          }
        }
      });
    }
  }, [isDarkMode, isSimpleMode, differences]);

  useEffect(() => {
    if (isSimpleMode && text1 && text2) {
      const diff = diffWords(text1, text2);
      setDifferences(diff);
      setFinalText(text2);
      
      // Make sure finalTextRef has the content for proper word count
      if (finalTextRef.current) {
        finalTextRef.current.textContent = text2;
      }
      // Update repeated words count when text changes in simple mode
      updateRepeatedWordsFinalText();
    }
  }, [text1, text2, isSimpleMode]);

  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  const handleCompare = () => {
    const diff = diffWords(text1, text2);
    setDifferences(diff);
    setDecisions([]);
    setFinalText(text2);

    if (finalTextRef.current) {
      finalTextRef.current.innerHTML = '';

      diff.forEach((part, index) => {
        const span = document.createElement('span');
        span.textContent = part.value;
        span.dataset.index = index.toString();
        span.dataset.type = part.added
          ? 'added'
          : part.removed
          ? 'removed'
          : 'unchanged';

        if (part.added) {
          span.className = isDarkMode
            ? 'bg-green-900/100 px-1 rounded'
            : 'bg-green-200 px-1 rounded';
        } else if (part.removed) {
          span.className = isDarkMode
            ? 'bg-red-900/100 px-1 rounded'
            : 'bg-red-200 px-1 rounded';
        }

        finalTextRef.current.appendChild(span);
      });

      finalTextRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    updateRepeatedWordsFinalText();
  };

  const handleKeep = (index: number) => {
    if (!finalTextRef.current) return;

    const diff = differences[index];

    setDecisions((prev) => [
      ...prev,
      {
        index,
        approved: true,
        diff,
      },
    ]);

    setDifferences((prev) =>
      prev.map((d, i) => (i === index ? { ...d, decided: true } : d))
    );

    const spans = finalTextRef.current.querySelectorAll('span');
    spans.forEach((span) => {
      const spanIndex = parseInt(span.dataset.index || '-1');

      if (spanIndex === index) {
        if (isIntuitiveModeActive) {
          if (diff.added) {
            span.className = '';
          } else if (diff.removed) {
            span.remove();
          }
        } else {
          span.className = '';
        }
      }
    });

    setFinalText(finalTextRef.current.textContent || '');
    updateRepeatedWordsFinalText();
  };

  const handleRemove = (index: number) => {
    if (!finalTextRef.current) return;

    const diff = differences[index];

    setDecisions((prev) => [
      ...prev,
      {
        index,
        approved: false,
        diff,
      },
    ]);

    setDifferences((prev) =>
      prev.map((d, i) => (i === index ? { ...d, decided: true } : d))
    );

    const spans = finalTextRef.current.querySelectorAll('span');
    spans.forEach((span) => {
      const spanIndex = parseInt(span.dataset.index || '-1');

      if (spanIndex === index) {
        if (isIntuitiveModeActive) {
          if (diff.added) {
            span.remove();
          } else if (diff.removed) {
            span.className = '';
          }
        } else {
          span.remove();
        }
      }
    });

    setFinalText(finalTextRef.current.textContent || '');
    updateRepeatedWordsFinalText();
  };

  const handleUndo = () => {
    if (!finalTextRef.current || decisions.length === 0) return;

    const lastDecision = decisions[decisions.length - 1];

    setDifferences((prev) =>
      prev.map((diff, i) =>
        i === lastDecision.index ? { ...diff, decided: false } : diff
      )
    );

    const spans = finalTextRef.current.querySelectorAll('span');

    let targetSpan: HTMLSpanElement | null = null;
    spans.forEach((span) => {
      const spanIndex = parseInt(span.dataset.index || '-1');
      if (spanIndex === lastDecision.index) {
        targetSpan = span;
      }
    });

    if (!targetSpan) {
      const newSpan = document.createElement('span');
      newSpan.textContent = lastDecision.diff.value;
      newSpan.dataset.index = lastDecision.index.toString();
      newSpan.dataset.type = lastDecision.diff.added
        ? 'added'
        : lastDecision.diff.removed
        ? 'removed'
        : 'unchanged';
      newSpan.className = lastDecision.diff.added
        ? isDarkMode
          ? 'bg-green-900/100 px-1 rounded'
          : 'bg-green-200 px-1 rounded'
        : isDarkMode
        ? 'bg-red-900/100 px-1 rounded'
        : 'bg-red-200 px-1 rounded';

      let insertionPoint: HTMLSpanElement | null = null;
      let insertAfter = false;
      spans.forEach((span) => {
        const spanIndex = parseInt(span.dataset.index || '-1');

        if (
          spanIndex < lastDecision.index &&
          (!insertionPoint ||
            spanIndex > parseInt(insertionPoint.dataset.index || '-1'))
        ) {
          insertionPoint = span;
          insertAfter = true;
        } else if (
          spanIndex > lastDecision.index &&
          (!insertionPoint ||
            spanIndex < parseInt(insertionPoint.dataset.index || '-1'))
        ) {
          insertionPoint = span;
          insertAfter = false;
        }
      });

      if (insertionPoint) {
        if (insertAfter) {
          if (insertionPoint.nextSibling) {
            finalTextRef.current.insertBefore(
              newSpan,
              insertionPoint.nextSibling
            );
          } else {
            finalTextRef.current.appendChild(newSpan);
          }
        } else {
          finalTextRef.current.insertBefore(newSpan, insertionPoint);
        }
      } else {
        finalTextRef.current.appendChild(newSpan);
      }
    } else {
      if (lastDecision.diff.added) {
        targetSpan.className = isDarkMode
          ? 'bg-green-900/100 px-1 rounded'
          : 'bg-green-200 px-1 rounded';
      } else if (lastDecision.diff.removed) {
        targetSpan.className = isDarkMode
          ? 'bg-red-900/100 px-1 rounded'
          : 'bg-red-200 px-1 rounded';
      }
    }

    setDecisions((prev) => prev.slice(0, -1));
    setFinalText(finalTextRef.current.textContent || '');
    updateRepeatedWordsFinalText();
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const toggleMode = () => {
    setIsSimpleMode((prev) => !prev);
    if (isSimpleMode) {
      setDifferences([]);
      setFinalText('');
      setDecisions([]);
    }
  };

  const toggleActionMode = () => {
    setIsIntuitiveModeActive((prev) => !prev);
  };

  const getVisibleDifferences = () => {
    if (!differences.length) return [];

    const undecidedChanges = differences
      .map((part, index) => ({ part, index }))
      .filter(({ part }) => (part.added || part.removed) && !part.decided);

    return undecidedChanges;
  };

  const handleApproveNext = () => {
    const visibleDiffs = getVisibleDifferences();
    if (visibleDiffs.length > 0) {
      handleKeep(visibleDiffs[0].index);
    }
  };

  const handleRejectNext = () => {
    const visibleDiffs = getVisibleDifferences();
    if (visibleDiffs.length > 0) {
      handleRemove(visibleDiffs[0].index);
    }
  };

  // Removed resize handlers as we're removing the dynamic split view

  const handleCopy = () => {
    if (finalTextRef.current) {
      const textToCopy = finalTextRef.current.textContent || '';
      navigator.clipboard.writeText(textToCopy).then(
        () => {
          setCopySuccess(true);
        },
        (err) => {
          console.error('Could not copy text: ', err);
        }
      );
    }
  };

  // Function to count words and characters in a text
  const countWordsAndChars = (text: string): { words: number; chars: number } => {
    const trimmedText = text.trim();
    const words = trimmedText ? trimmedText.split(/\s+/).length : 0;
    const chars = text.length;
    return { words, chars };
  };

  const countRepeatedWords = (
    text: string,
    minLength: number,
    repetitionThreshold: number
  ): { [word: string]: number } => {
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length >= minLength);
    const wordCounts: { [word: string]: number } = {};
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
    const repeated: { [word: string]: number } = {};
    for (const word in wordCounts) {
      if (wordCounts[word] > repetitionThreshold) {
        repeated[word] = wordCounts[word];
      }
    }
    return repeated;
  };

  useEffect(() => {
    setRepeatedWordsText1(
      countRepeatedWords(text1, charThreshold, repetitionThreshold)
    );
  }, [text1, charThreshold, repetitionThreshold]);

  useEffect(() => {
    setRepeatedWordsText2(
      countRepeatedWords(text2, charThreshold, repetitionThreshold)
    );
  }, [text2, charThreshold, repetitionThreshold]);

  const updateRepeatedWordsFinalText = () => {
    if (isSimpleMode) {
      setRepeatedWordsFinalText(
        countRepeatedWords(
          text2,
          charThreshold,
          repetitionThreshold
        )
      );
    } else {
      setRepeatedWordsFinalText(
        countRepeatedWords(
          finalTextRef.current?.textContent || '',
          charThreshold,
          repetitionThreshold
        )
      );
    }
  };

  const handleCharThresholdChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCharThreshold(Number(e.target.value));
  };

  const handleRepetitionThresholdChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRepetitionThreshold(Number(e.target.value));
  };

  const openSettingsModal = () => {
    setShowSettingsModal(true);
  };

  const closeSettingsModal = () => {
    setShowSettingsModal(false);
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isDarkMode
          ? 'bg-gray-900 text-white dark-scrollbar'
          : 'bg-white text-gray-900'
      }`}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Text Comparison Tool</h1>
          <div className="flex gap-4 items-center">
            {user ? (
              <div className="flex items-center gap-4">
                <img
                  src={
                    user.user_metadata?.avatar_url ||
                    user.user_metadata?.picture
                  }
                  alt="Profile"
                  className="rounded-full w-8 h-8"
                />
                <button
                  onClick={handleLogout}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                  title="Sign Out"
                >
                  <LogOut
                    size={18}
                    className={isDarkMode ? 'text-white' : 'text-gray-700'}
                  />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isSigningIn}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
                title={isSigningIn ? 'Signing in...' : 'Sign In'}
              >
                <LogIn
                  size={18}
                  className={isDarkMode ? 'text-white' : 'text-gray-700'}
                />
              </button>
            )}

            <button
              onClick={openSettingsModal}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              <Settings
                className={isDarkMode ? 'text-white' : 'text-gray-700'}
              />
            </button>

            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {isDarkMode ? (
                <Sun className="text-yellow-400" />
              ) : (
                <Moon className="text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {showSettingsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className={`p-6 rounded-lg shadow-xl ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <h3 className="text-xl font-bold mb-4">Settings</h3>
              <div className="mb-4">
                <label
                  htmlFor="charThreshold"
                  className="block text-sm font-medium mb-2"
                >
                  Character Length Threshold
                </label>
                <input
                  type="number"
                  id="charThreshold"
                  value={charThreshold}
                  onChange={handleCharThresholdChange}
                  className={`w-full p-2 rounded border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="repetitionThreshold"
                  className="block text-sm font-medium mb-2"
                >
                  Repetition Threshold (more than)
                </label>
                <input
                  type="number"
                  id="repetitionThreshold"
                  value={repetitionThreshold}
                  onChange={handleRepetitionThresholdChange}
                  className={`w-full p-2 rounded border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={closeSettingsModal}
                  className={`px-4 py-2 rounded ${
                    isDarkMode ? 'bg-gray-700 text-white' : 'bg-gray-200'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}



        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div
              className={`p-6 rounded-lg shadow-xl ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <h3 className="text-xl font-bold mb-4">Save Comparison</h3>
              <input
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="Enter a title for this comparison"
                className={`w-full p-2 rounded border mb-4 ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600'
                    : 'bg-white border-gray-300'
                }`}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className={`px-4 py-2 rounded ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfirm}
                  className="px-4 py-2 rounded bg-blue-600 text-white"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {showHistory ? (
          <div
            className={`rounded-lg shadow-lg p-6 mb-8 ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Comparison History</h2>
              <button
                onClick={() => setShowHistory(false)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300 ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                } transform hover:scale-105 focus:outline-none`}
                title="Back to Comparison"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
            </div>
            <div className="space-y-4">
              {comparisons.map((comparison) => (
                <div
                  key={comparison.id}
                  className={`p-4 rounded-lg cursor-pointer transition-colors relative ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => handleLoadComparison(comparison)}
                  onMouseEnter={() => setHoveredComparisonId(comparison.id)}
                  onMouseLeave={() => setHoveredComparisonId(null)}
                >
                  {editingComparisonId === comparison.id ? (
                    <form onSubmit={handleRenameComparison} className="mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingComparisonTitle}
                          onChange={(e) => setEditingComparisonTitle(e.target.value)}
                          className={`w-full p-1 rounded ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              setEditingComparisonId(null);
                            }
                          }}
                        />
                        <button 
                          type="submit" 
                          className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'bg-gray-600 hover:bg-green-500' : 'bg-gray-200 hover:bg-green-100'}`}
                          onClick={(e) => e.stopPropagation()}
                          title="Confirm"
                        >
                          <Check size={18} className={isDarkMode ? 'text-white hover:text-green-100' : 'text-gray-700 hover:text-green-500'} />
                        </button>
                        <button 
                          type="button" 
                          className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'bg-gray-600 hover:bg-red-500' : 'bg-gray-200 hover:bg-red-100'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingComparisonId(null);
                          }}
                          title="Cancel"
                        >
                          <X size={18} className={isDarkMode ? 'text-white hover:text-red-100' : 'text-gray-700 hover:text-red-500'} />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <h3 className="font-semibold">{comparison.title}</h3>
                  )}
                  <p className="text-sm text-gray-500">
                    {new Date(comparison.created_at).toLocaleDateString()}
                  </p>
                  
                  {hoveredComparisonId === comparison.id && editingComparisonId !== comparison.id && (
                    <div 
                      className="absolute top-2 right-2 flex space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}
                        onClick={(e) => handleStartRenameComparison(e, comparison)}
                        title="Rename"
                      >
                        <Pencil size={20} className={isDarkMode ? 'text-white' : 'text-gray-700'} />
                      </button>
                      <button
                        className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'bg-gray-600 hover:bg-red-500' : 'bg-gray-200 hover:bg-red-100'}`}
                        onClick={(e) => handleDeleteComparison(e, comparison.id)}
                        title="Delete"
                      >
                        <Trash2 size={20} className={isDarkMode ? 'text-white hover:text-red-100' : 'text-gray-700 hover:text-red-500'} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {comparisons.length === 0 && (
                <p className="text-center text-gray-500">
                  No saved comparisons yet
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-2">
                <label className="block text-lg font-medium">
                  Original Text
                </label>
                <div className="flex flex-col">
                  <textarea
                    value={text1}
                    onChange={(e) => setText1(e.target.value)}
                    className={`w-full h-64 p-4 rounded-lg border transition-colors ${
                      isDarkMode
                        ? 'border-gray-600 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        : 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    }`}
                    placeholder="Paste original text here..."
                  />
                  <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Words: {countWordsAndChars(text1).words} | Characters: {countWordsAndChars(text1).chars}
                  </div>
                  
                  {showRepeatedWords && (
                    <div
                      className={`w-96 p-4 rounded-lg border ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-800 text-white'
                          : 'border-gray-300 bg-white'
                      } ml-2 overflow-y-auto max-h-64`}
                    >
                      <div className="text-wrap">
                        {Object.entries(repeatedWordsText1)
                          .sort(([, countA], [, countB]) => countB - countA)
                          .map(([word, count], index, array) => (
                            <span key={word}>
                              <span className="font-medium">{word}</span>: {count}
                              {index < array.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        {Object.keys(repeatedWordsText1).length === 0 && (
                          <span className="text-gray-500 text-sm">
                            No repeated words.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-lg font-medium">
                  Modified Text
                </label>
                <div className="flex flex-col">
                  <textarea
                    value={text2}
                    onChange={(e) => setText2(e.target.value)}
                    className={`w-full h-64 p-4 rounded-lg border transition-colors ${
                      isDarkMode
                        ? 'border-gray-600 bg-gray-800 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                        : 'border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    }`}
                    placeholder="Paste modified text here..."
                  />
                  <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Words: {countWordsAndChars(text2).words} | Characters: {countWordsAndChars(text2).chars}
                  </div>
                  {showRepeatedWords && (
                    <div
                      className={`w-96 p-4 rounded-lg border ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-800 text-white'
                          : 'border-gray-300 bg-white'
                      } ml-2 overflow-y-auto max-h-64`}
                    >
                      <div className="text-wrap">
                        {Object.entries(repeatedWordsText2)
                          .sort(([, countA], [, countB]) => countB - countA)
                          .map(([word, count], index, array) => (
                            <span key={word}>
                              <span className="font-medium">{word}</span>: {count}
                              {index < array.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        {Object.keys(repeatedWordsText2).length === 0 && (
                          <span className="text-gray-500 text-sm">
                            No repeated words.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 mb-8">
                <button
                  onClick={handleCompare}
                  className={`px-6 py-3 text-white rounded-lg font-medium transition-all duration-300 ${
                    isDarkMode ? 'glass-button-green' : 'glass-button-green'
                  } transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50`}
                >
                  Compare Texts
                </button>
                <button
                  onClick={() => setShowRepeatedWords(prev => !prev)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  } transform hover:scale-105 focus:outline-none`}
                  title={showRepeatedWords ? "Hide Repeated Words" : "Show Repeated Words"}
                >
                  {showRepeatedWords ? "Hide Repeated Words" : "Show Repeated Words"}
                </button>
                <button
                  onClick={user ? handleSave : handleLogin}
                  className={`p-3 rounded-lg transition-all duration-300 ${user ? 
                    (isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300') : 
                    (isDarkMode ? 'bg-gray-700 opacity-60 hover:opacity-100' : 'bg-gray-200 opacity-60 hover:opacity-100')
                  } transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50`}
                  title={user ? "Save Comparison" : "Sign in"}
                >
                  <Save size={18} className={user ? (isDarkMode ? "text-white" : "text-gray-800") : "text-white"} />
                </button>
                <button
                  onClick={user ? () => setShowHistory((prev) => !prev) : handleLogin}
                  className={`p-3 rounded-lg transition-all duration-300 ${user ? 
                    (isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300') : 
                    (isDarkMode ? 'bg-gray-700 opacity-60 hover:opacity-100' : 'bg-gray-200 opacity-60 hover:opacity-100')
                  } transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50`}
                  title={user ? (showHistory ? 'Hide History' : 'Show History') : "Sign in"}
                >
                  <History size={18} className={user ? (isDarkMode ? "text-white" : "text-gray-800") : "text-white"} />
                </button>
                <div className="relative inline-flex items-center">
                  <span
                    className={`mr-2 text-sm ${!isSimpleMode ? 'font-bold' : ''}`}
                  >
                    Advanced
                  </span>
                  <div
                    onClick={toggleMode}
                    className={`w-16 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`bg-blue-600 w-6 h-6 rounded-full shadow-md transform transition-transform ${
                        isSimpleMode ? 'translate-x-8' : 'translate-x-0'
                      }`}
                    />
                  </div>
                  <span
                    className={`ml-2 text-sm ${isSimpleMode ? 'font-bold' : ''}`}
                  >
                    Simple
                  </span>
                </div>
              </div>

            <div
              className={`rounded-lg shadow-lg p-6 transition-colors ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              <div className="mb-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-semibold">Comparison Result</h2>
                    {isSimpleMode && (
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Words: {countWordsAndChars(text2).words} | 
                        Characters: {countWordsAndChars(text2).chars}
                      </div>
                    )}
                  </div>

                  {!isSimpleMode && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUndo}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300 ${
                          isDarkMode ? 'glass-button-blue' : 'glass-button-blue'
                        } text-white transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 ${
                          decisions.length === 0
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                        title="Undo last decision"
                        disabled={decisions.length === 0}
                      >
                        <Undo2 size={16} />
                        <span>Undo</span>
                      </button>

                      <button
                        onClick={handleApproveNext}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300 ${
                          isDarkMode
                            ? 'glass-button-green'
                            : 'glass-button-green'
                        } text-white transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 ${
                          getVisibleDifferences().length === 0
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                        title="Approve Next Change"
                        disabled={getVisibleDifferences().length === 0}
                      >
                        <Check size={16} />
                        <ChevronRight size={16} />
                      </button>

                      <button
                        onClick={handleRejectNext}
                        className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300 ${
                          isDarkMode ? 'glass-button-red' : 'glass-button-red'
                        } text-white transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 ${
                          getVisibleDifferences().length === 0
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }`}
                        title="Reject Next Change"
                        disabled={getVisibleDifferences().length === 0}
                      >
                        <X size={16} />
                        <ChevronRight size={16} />
                      </button>

                      <div className="relative group">
                        <button
                          className={`p-2 rounded-lg transition-colors ${
                            isDarkMode
                              ? 'bg-gray-700 hover:bg-gray-600'
                              : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                          title="Information"
                        >
                          <Info size={18} className={isDarkMode ? 'text-white' : 'text-gray-700'} />
                        </button>
                        <div className={`absolute right-0 w-64 p-3 rounded-lg shadow-lg z-10 transform scale-0 group-hover:scale-100 transition-transform origin-top-right ${
                          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
                        }`}>
                          <p className="text-sm"><span className="inline-flex items-center gap-1"><Pencil size={14} className="mr-1 text-yellow-500" /> You can modify text in this mode.</span></p>
                          <p className="text-sm"><span className="inline-flex items-center"><Check size={14} className="mr-1 text-green-500" /> Approves changes.</span></p>
                          <p className="text-sm"><span className="inline-flex items-center"><X size={14} className="mr-1 text-red-500" /> Discards changes.</span></p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {isSimpleMode ? (
                <div>
                  <div className="flex flex-col mb-4">
                    {showRepeatedWords && (
                      <div
                        className={`w-full p-4 rounded-lg border ${
                          isDarkMode
                            ? 'border-gray-600 bg-gray-800 text-white'
                            : 'border-gray-300 bg-white'
                        } mb-4 overflow-y-auto relative max-h-64`}
                      >
                        <div className="text-wrap">
                          {Object.entries(repeatedWordsFinalText)
                            .sort(([, countA], [, countB]) => countB - countA)
                            .map(([word, count], index, array) => (
                              <span key={word}>
                                <span className="font-medium">{word}</span>: {count}
                                {index < array.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          {Object.keys(repeatedWordsFinalText).length === 0 && (
                            <span className="text-gray-500 text-sm">
                              No repeated words.
                            </span>
                          )}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button
                            onClick={updateRepeatedWordsFinalText}
                            className={`p-2 rounded-full transition-all ${
                              isDarkMode
                                ? 'bg-gray-700 hover:bg-gray-600'
                                : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            title="Update repeated words count"
                          >
                            <RefreshCw
                              size={18}
                              className={
                                isDarkMode ? 'text-white' : 'text-gray-700'
                              }
                            />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-lg leading-relaxed">
                    {differences.map((part, index) => (
                      <span
                        key={index}
                        className={`
                      ${
                        part.added
                          ? (isDarkMode ? 'bg-green-900/100' : 'bg-green-200') +
                            ' px-1 rounded'
                          : ''
                      }
                      ${
                        part.removed
                          ? (isDarkMode ? 'bg-red-900/100' : 'bg-red-200') +
                            ' px-1 rounded'
                          : ''
                      }
                    `}
                      >
                        {part.value}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {!isSimpleMode && (
                    <div className="flex flex-col" style={{width: '100%'}}>
                      <div className={`mb-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Words: {countWordsAndChars(finalTextRef.current?.textContent || '').words} | 
                        Characters: {countWordsAndChars(finalTextRef.current?.textContent || '').chars}
                      </div>
                      
                      {showRepeatedWords && (
                        <div
                          className={`p-4 rounded-lg border ${
                            isDarkMode
                              ? 'border-gray-600 bg-gray-800 text-white'
                              : 'border-gray-300 bg-white'
                          } mb-4 overflow-y-auto relative max-h-64`}
                        >
                          <ul>
                            {Object.entries(repeatedWordsFinalText)
                              .sort(([, countA], [, countB]) => countB - countA)
                              .map(([word, count], index, array) => (
                                <span key={word}>
                                  <span className="font-medium">{word}</span>: {count}
                                  {index < array.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            {Object.keys(repeatedWordsFinalText).length === 0 && (
                              <li className="text-gray-500 text-sm">
                                No repeated words.
                              </li>
                            )}
                          </ul>
                          <div className="absolute top-2 right-2 flex gap-2">
                            <button
                              onClick={updateRepeatedWordsFinalText}
                              className={`p-2 rounded-full transition-all ${
                                isDarkMode
                                  ? 'bg-gray-700 hover:bg-gray-600'
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                              title="Update repeated words count"
                            >
                              <RefreshCw
                                size={18}
                                className={
                                  isDarkMode ? 'text-white' : 'text-gray-700'
                                }
                              />
                            </button>
                          </div>
                        </div>
                      )}
                      <div
                        className={`p-4 rounded border relative text-lg leading-relaxed outline-none min-h-[300px] whitespace-pre-wrap mb-4 md:mb-0 overflow-y-auto ${
                          isDarkMode
                            ? 'dark-scrollbar border-gray-700'
                            : 'border-gray-300'
                        } ${
                          isFinalTextFocused
                            ? 'ring-2 ring-blue-500 border-transparent'
                            : ''
                        }`}
                        style={{
                          width: '100%'
                        }}
                      >
                        <div
                          ref={finalTextRef}
                          className="h-full outline-none overflow-y-auto"
                          contentEditable
                          suppressContentEditableWarning
                          onFocus={() => setIsFinalTextFocused(true)}
                          onBlur={() => setIsFinalTextFocused(false)}
                        ></div>

                        <button
                          onClick={handleCopy}
                          className={`absolute bottom-2 right-2 p-2 rounded-full transition-all ${
                            isDarkMode
                              ? 'bg-gray-700 hover:bg-gray-600'
                              : 'bg-gray-200 hover:bg-gray-300'
                          } ${copySuccess ? 'scale-110' : ''}`}
                          title="Copy text to clipboard"
                        >
                          {copySuccess ? (
                            <CheckCircle size={18} className="text-green-500" />
                          ) : (
                            <Copy
                              size={18}
                              className={
                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                              }
                            />
                          )}
                        </button>
                      </div>

                    </div>
                  )}

                  {/* Removed resize handle */}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <footer
        className={`py-6 ${
          isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
        } mt-12`}
      >
        <div className="container mx-auto px-4 flex justify-center items-center">
          <a
            href="https://github.com/PedRaMNG/text-comparison-tool"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
              isDarkMode
                ? 'hover:bg-gray-700'
                : 'hover:bg-gray-200'
            }`}
          >
            <Github size={20} />
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
