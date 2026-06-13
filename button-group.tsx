import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSageChat, useSynthesizeSpeech, type SageChatMessage } from '@workspace/api-client-react';
import { TypingIndicator } from './TypingIndicator';

interface ChatScreenProps {
  onComplete: (history: SageChatMessage[]) => void;
  onSkip: () => void;
}

function cleanTranscript(text: string): string {
  const t = text.trim();
  if (!t) return t;
  const capitalized = t[0].toUpperCase() + t.slice(1);
  return /[.!?…]$/.test(capitalized) ? capitalized : capitalized + '.';
}

export function ChatScreen({ onComplete, onSkip }: ChatScreenProps) {
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [gender, setGender] = useState<'female' | 'male'>('female');
  const [history, setHistory] = useState<SageChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [micState, setMicState] = useState<'idle' | 'listening' | 'speaking' | 'thinking'>('idle');
  const [barsData, setBarsData] = useState<number[]>([4, 9, 5, 14, 7, 11, 4, 8]);
  const [liveTranscript, setLiveTranscript] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const barTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const isListeningRef = useRef(false);
  const pendingRef = useRef('');
  const recognitionGenRef = useRef(0);

  // Stable refs — always hold the latest version to avoid stale closures
  const handleUserMessageRef = useRef<(text: string) => void>(() => {});
  const historyRef = useRef(history);
  const micStateRef = useRef(micState);
  const modeRef = useRef(mode);
  const genderInitRef = useRef(false);
  // speakText is called from async callbacks — always access via ref so we get the freshest closure
  const speakTextRef = useRef<(text: string, onDone?: () => void) => void>(() => {});

  const sageChat = useSageChat();
  const synthesizeSpeech = useSynthesizeSpeech();
  const initialized = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { micStateRef.current = micState; }, [micState]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isTyping]);

  // ─── Bar animation ──────────────────────────────────────────────────────────
  const stopBars = useCallback(() => {
    if (barTimerRef.current) { clearTimeout(barTimerRef.current); barTimerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    setBarsData([4, 9, 5, 14, 7, 11, 4, 8]);
  }, []);

  const animateBars = useCallback((color: 'warm' | 'sage') => {
    stopBars();
    const draw = () => {
      setBarsData(Array.from({ length: 8 }, () => 3 + Math.random() * 15));
      barTimerRef.current = setTimeout(() => { animFrameRef.current = requestAnimationFrame(draw); }, 110);
    };
    draw();
  }, [stopBars]);

  // ─── Audio / TTS ────────────────────────────────────────────────────────────
  const stopAudio = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; audioRef.current = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    stopBars();
  }, [stopBars]);

  // speakText accepts an optional onDone callback — called when audio finishes (or on any error).
  // This is how the profile overlay waits for the final Sage message to finish speaking
  // before transitioning. All async callers must use speakTextRef.current(), not speakText directly.
  const speakWithBrowser = useCallback((text: string, onDone?: () => void) => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setMicState('idle');
      onDone?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text.replace(/\[INTERVIEW_COMPLETE\]/g, '').trim());
    utterance.rate = 0.95;
    utterance.pitch = gender === 'male' ? 0.9 : 1.05;
    utterance.onstart = () => { setMicState('speaking'); animateBars('warm'); };
    utterance.onend = () => {
      setMicState('idle');
      stopBars();
      onDone?.();
    };
    utterance.onerror = () => {
      setMicState('idle');
      stopBars();
      onDone?.();
    };
    window.speechSynthesis.speak(utterance);
  }, [gender, animateBars, stopBars]);

  const speakText = useCallback((text: string, onDone?: () => void) => {
    stopAudio();
    setMicState('thinking');

    synthesizeSpeech.mutate({ data: { text, gender } }, {
      onSuccess: (data) => {
        try {
          const bytes = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
          const blob = new Blob([bytes], { type: data.contentType });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onplay = () => { setMicState('speaking'); animateBars('warm'); };
          audio.onended = () => {
            setMicState('idle');
            stopBars();
            URL.revokeObjectURL(url);
            onDone?.();
          };
          audio.onerror = () => {
            setMicState('idle');
            stopBars();
            onDone?.();
          };
          audio.play().catch(() => speakWithBrowser(text, onDone));
        } catch {
          speakWithBrowser(text, onDone);
        }
      },
      onError: () => {
        speakWithBrowser(text, onDone);
      },
    });
  }, [gender, synthesizeSpeech, stopAudio, animateBars, stopBars, speakWithBrowser]);

  // Keep speakTextRef current — all async callbacks MUST use speakTextRef.current()
  useEffect(() => { speakTextRef.current = speakText; }, [speakText]);

  // ─── Initial greeting ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setIsTyping(true);
      sageChat.mutate({ data: { history: [], userMessage: null } }, {
        onSuccess: (data) => {
          setIsTyping(false);
          setHistory([{ role: 'assistant', content: data.reply }]);
          // Use ref — speakText may have changed since mount
          if (modeRef.current === 'voice') speakTextRef.current(data.reply);
        },
        onError: () => setIsTyping(false),
      });
    }
    return () => {
      stopAudio();
      forceStopListening();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Re-speak last Sage message when gender changes ──────────────────────────
  useEffect(() => {
    if (!genderInitRef.current) { genderInitRef.current = true; return; }
    if (modeRef.current !== 'voice') return;
    const ms = micStateRef.current;
    if (ms === 'listening' || ms === 'thinking') return;
    const last = [...historyRef.current].reverse().find(m => m.role === 'assistant');
    if (last) speakTextRef.current(last.content.replace(/\[INTERVIEW_COMPLETE\]/g, '').trim());
  }, [gender]);

  // ─── Voice recognition ───────────────────────────────────────────────────────
  // Uses continuous:true (one session per tap) with a createAndStart local closure
  // that captures sessionGen — avoids stale closures and the mic-release race
  // condition that made continuous:false unreliable between utterances.

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input is not supported in this browser. Please use Chrome.');
      return;
    }

    // Abort any existing instance immediately so the mic is released
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }

    stopAudio();
    pendingRef.current = '';
    setLiveTranscript('');
    isListeningRef.current = true;
    setMicState('listening');

    // sessionGen is the unique ID for this listening session.
    // All callbacks close over it — if it no longer matches recognitionGenRef
    // (because stop was called), callbacks bail out immediately.
    const sessionGen = ++recognitionGenRef.current;

    // createAndStart is a local function (not a hook/callback) so it safely
    // closes over sessionGen without any stale-closure risk.
    function createAndStart() {
      if (!isListeningRef.current || sessionGen !== recognitionGenRef.current) return;

      const r = new SR();
      r.continuous = true;       // stays open across natural pauses — no restart needed
      r.interimResults = true;
      r.lang = 'en-US';

      r.onresult = (e: any) => {
        if (sessionGen !== recognitionGenRef.current) return;
        let finalPart = '';
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalPart += e.results[i][0].transcript;
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        if (finalPart) {
          pendingRef.current = (pendingRef.current + ' ' + finalPart).trim();
        }
        setLiveTranscript((pendingRef.current + (interim ? ' ' + interim : '')).trim());
      };

      r.onerror = (e: any) => {
        if (sessionGen !== recognitionGenRef.current) return;
        if (e.error === 'aborted') return;   // we called abort(), not an error
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          isListeningRef.current = false;
          setMicState('idle');
          alert('Microphone permission denied. Please allow mic access and try again.');
          return;
        }
        // no-speech, audio-capture, network — restart after brief pause
        if (isListeningRef.current) {
          recognitionRef.current = null;
          setTimeout(createAndStart, 400);
        }
      };

      r.onend = () => {
        if (sessionGen !== recognitionGenRef.current) return;
        if (isListeningRef.current) {
          // Ended unexpectedly (browser timeout / network drop) — restart
          recognitionRef.current = null;
          setTimeout(createAndStart, 200);
        }
      };

      recognitionRef.current = r;
      try {
        r.start();
      } catch {
        // start() threw — browser hasn't released mic yet, retry shortly
        recognitionRef.current = null;
        if (isListeningRef.current && sessionGen === recognitionGenRef.current) {
          setTimeout(createAndStart, 350);
        }
      }
    }

    // Small delay before the first start so any prior instance's mic lock is released
    setTimeout(createAndStart, 60);
  }, [stopAudio]);

  const forceStopListening = useCallback(() => {
    isListeningRef.current = false;
    recognitionGenRef.current++;   // invalidates all pending createAndStart callbacks
    setLiveTranscript('');
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  }, []);

  const stopListeningAndSend = useCallback(() => {
    const raw = pendingRef.current.trim();

    isListeningRef.current = false;
    recognitionGenRef.current++;   // invalidates any pending restart callbacks
    setLiveTranscript('');
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    pendingRef.current = '';

    if (raw) {
      const text = cleanTranscript(raw);
      setMicState('thinking');
      handleUserMessageRef.current(text);
    } else {
      setMicState('idle');
    }
  }, []);

  // Always reads micStateRef (never stale state) — handles rapid double-taps correctly
  const handleMicTap = useCallback(() => {
    const cur = micStateRef.current;
    if (cur === 'thinking') return;
    if (cur === 'speaking') { stopAudio(); setMicState('idle'); return; }
    if (cur === 'listening') { stopListeningAndSend(); }
    else { startListening(); }
  }, [stopAudio, stopListeningAndSend, startListening]);

  // ─── Send user message ──────────────────────────────────────────────────────
  const handleUserMessage = useCallback((text: string) => {
    if (!text.trim() || isTyping) return;

    stopAudio();

    const newHistory = [...history, { role: 'user', content: text }];
    setHistory(newHistory);
    setInputValue('');
    setIsTyping(true);

    sageChat.mutate({ data: { history, userMessage: text } }, {
      onSuccess: (data) => {
        setIsTyping(false);
        const reply = data.reply.replace(/\[INTERVIEW_COMPLETE\]/g, '').trim();
        const updatedHistory = [...newHistory, { role: 'assistant', content: reply }];
        setHistory(updatedHistory);
        setExchangeCount(prev => prev + 1);

        if (data.complete) {
          if (modeRef.current === 'voice') {
            // Wait for the final spoken message to finish before showing the overlay
            speakTextRef.current(reply, () => onComplete(updatedHistory));
          } else {
            // In text mode, give user a moment to read the final message
            setTimeout(() => onComplete(updatedHistory), 2500);
          }
        } else {
          // Use refs so we always call the freshest speakText, not a stale closure
          if (modeRef.current === 'voice') speakTextRef.current(reply);
          else setMicState('idle');
        }
      },
      onError: () => {
        setIsTyping(false);
        setMicState('idle');
      },
    });
  // Intentionally omit speakText and mode — use refs above to avoid stale closures
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, isTyping, stopAudio, sageChat, onComplete]);

  useEffect(() => {
    handleUserMessageRef.current = handleUserMessage;
  }, [handleUserMessage]);

  const handleTextSend = useCallback(() => {
    handleUserMessage(inputValue);
  }, [inputValue, handleUserMessage]);

  // ─── Quick replies ──────────────────────────────────────────────────────────
  const getQuickReplies = useCallback(() => {
    const last = history.filter(m => m.role === 'assistant').at(-1)?.content.toLowerCase() ?? '';
    if (last.includes('first time') || last.includes('therapy before')) return ["First time", "I've tried therapy before", "I tried but stopped"];
    if (last.includes('how long') || last.includes('been going on')) return ["A few weeks", "Several months", "Over a year"];
    if (last.includes('better') || last.includes('hope') || last.includes('goal')) return ["Feel less anxious", "Get unstuck", "Understand myself better"];
    if (last.includes('telehealth') || last.includes('in-person') || last.includes('online')) return ["Telehealth preferred", "In-person only", "Either works"];
    if (last.includes('insurance') || last.includes('cost') || last.includes('budget')) return ["I have insurance", "Sliding scale please", "I can pay out of pocket"];
    if (last.includes('structured') || last.includes('tools') || last.includes('approach')) return ["Structured with tools", "More open and exploratory", "A bit of both"];
    return ["Tell me more", "Yes, exactly", "Not quite"];
  }, [history]);

  const progressPct = Math.min((exchangeCount / 8) * 100, 90);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="bg-[#faf7f2] py-3.5 px-[18px] border-b-[0.5px] border-[#ddd8d0] flex items-center gap-[10px] shrink-0">
        <div className="w-[36px] h-[36px] bg-[#e8f0eb] rounded-full flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" fill="#e8f0eb"/>
            <path d="M7 10c0-1.66 1.34-3 3-3s3 1.34 3 3" stroke="#4a7c59" strokeWidth="1.3" strokeLinecap="round"/>
            <circle cx="10" cy="13" r="1" fill="#4a7c59"/>
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-medium text-[#2e2a25]">Sage · PsyConnect</div>
          <div className="text-[11px] text-[#4a7c59] font-light">
            {micState === 'listening' ? 'Listening…' : micState === 'speaking' ? 'Speaking…' : micState === 'thinking' ? 'Thinking…' : 'Here to listen'}
          </div>
        </div>
        <button onClick={onSkip} className="bg-[#e8f0eb] border-none text-[#4a7c59] text-[11px] py-1.5 px-2.5 rounded-[10px] cursor-pointer font-sans">
          Skip →
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-[#e0dbd3] shrink-0">
        <div className="h-full bg-[#4a7c59] transition-[width] duration-700 ease-in-out" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3.5 px-3 flex flex-col gap-2.5 scroll-smooth [scrollbar-width:thin] [scrollbar-color:#ccc8c0_transparent]">
        {history.map((msg, idx) => (
          <div key={idx} className={`flex flex-col max-w-[84%] animate-[msgIn_0.3s_ease] ${msg.role === 'assistant' ? 'self-start' : 'self-end'}`}>
            <div className={`px-3.5 py-[11px] rounded-[18px] text-[13.5px] leading-[1.55] ${
              msg.role === 'assistant'
                ? 'bg-[#f0ece4] text-[#2e2a25] rounded-bl-[5px]'
                : 'bg-[#4a7c59] text-white rounded-br-[5px]'
            }`}>
              {msg.content.replace(/\[INTERVIEW_COMPLETE\]/g, '')}
            </div>
          </div>
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Crisis banner */}
      <div className="bg-[#fff4f0] border-t border-[#f5c4b3] py-[7px] px-3.5 flex items-center gap-2 text-[11px] text-[#993c1d] shrink-0">
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="#993c1d" strokeWidth="1"/>
          <path d="M7 4v4M7 10v.5" stroke="#993c1d" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        PsyConnect is not a medical service. In crisis? Call or text <strong className="ml-[3px]">988</strong>
      </div>

      {/* Input area */}
      <div className="p-2.5 px-3.5 pb-[15px] border-t-[0.5px] border-[#ddd8d0] bg-[#faf7f2] shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex gap-[6px]">
            <button
              className={`py-[5px] px-3 rounded-[20px] text-[12px] font-sans cursor-pointer border-[0.5px] transition-all ${mode === 'voice' ? 'bg-[#e8f0eb] text-[#4a7c59] border-[#8fb99a]' : 'bg-transparent text-[#7a6f65] border-[#ccc8c0]'}`}
              onClick={() => { setMode('voice'); forceStopListening(); stopAudio(); }}
            >
              Voice
            </button>
            <button
              className={`py-[5px] px-3 rounded-[20px] text-[12px] font-sans cursor-pointer border-[0.5px] transition-all ${mode === 'text' ? 'bg-[#e8f0eb] text-[#4a7c59] border-[#8fb99a]' : 'bg-transparent text-[#7a6f65] border-[#ccc8c0]'}`}
              onClick={() => { setMode('text'); forceStopListening(); stopAudio(); }}
            >
              Type
            </button>
          </div>
          <div className="flex bg-[#f0ece4] border-[0.5px] border-[#ccc8c0] rounded-[20px] p-[3px]">
            <button
              className={`py-1 px-2.5 rounded-[16px] text-[11px] cursor-pointer font-sans border-none transition-all ${gender === 'female' ? 'bg-white text-[#4a7c59] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'bg-transparent text-[#7a6f65]'}`}
              onClick={() => setGender('female')}
            >
              Female
            </button>
            <button
              className={`py-1 px-2.5 rounded-[16px] text-[11px] cursor-pointer font-sans border-none transition-all ${gender === 'male' ? 'bg-white text-[#4a7c59] font-medium shadow-[0_1px_3px_rgba(0,0,0,0.08)]' : 'bg-transparent text-[#7a6f65]'}`}
              onClick={() => setGender('male')}
            >
              Male
            </button>
          </div>
        </div>

        {/* Voice UI */}
        {mode === 'voice' ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-[3px] h-[20px]">
              {barsData.map((h, i) => (
                <div key={i} className="w-[3px] rounded-[2px] transition-all duration-100" style={{
                  height: (micState === 'idle' || micState === 'thinking') ? '4px' : `${h}px`,
                  background: micState === 'speaking' ? '#c4956a' : '#8fb99a',
                }} />
              ))}
            </div>

            <div className="relative w-[76px] h-[76px] flex items-center justify-center">
              {micState === 'listening' && (
                <div className="absolute inset-0 rounded-full bg-[#4a7c59] animate-[ripple_1.4s_ease-out_infinite]" />
              )}
              <button
                className={`relative z-10 w-[66px] h-[66px] rounded-full border-2 flex items-center justify-center cursor-pointer transition-all select-none ${
                  micState === 'listening' ? 'bg-[#4a7c59] border-[#4a7c59]' :
                  micState === 'speaking' ? 'bg-[#f5ede3] border-[#c4956a]' :
                  micState === 'thinking' ? 'bg-[#f5f5f2] border-[#ccc] cursor-default' :
                  'bg-[#e8f0eb] border-[#8fb99a] hover:border-[#4a7c59]'
                }`}
                onClick={handleMicTap}
                data-testid="mic-button"
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  {micState === 'speaking' ? (
                    <path d="M6 10h4l5-5v18l-5-5H6V10z M19 8c2 1.5 3 3.5 3 6s-1 4.5-3 6M16 11c1 0.8 1.5 1.8 1.5 3s-0.5 2.2-1.5 3" stroke="#c4956a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  ) : (
                    <>
                      <rect x="9" y="3" width="10" height="15" rx="5" fill={micState === 'listening' ? 'white' : micState === 'thinking' ? '#bbb' : '#4a7c59'}/>
                      <path d="M5 13c0 4.97 4.03 9 9 9s9-4.03 9-9" stroke={micState === 'listening' ? 'white' : micState === 'thinking' ? '#bbb' : '#4a7c59'} strokeWidth="1.8" strokeLinecap="round"/>
                      <line x1="14" y1="22" x2="14" y2="26" stroke={micState === 'listening' ? 'white' : micState === 'thinking' ? '#bbb' : '#4a7c59'} strokeWidth="1.8" strokeLinecap="round"/>
                      <line x1="10" y1="26" x2="18" y2="26" stroke={micState === 'listening' ? 'white' : micState === 'thinking' ? '#bbb' : '#4a7c59'} strokeWidth="1.8" strokeLinecap="round"/>
                    </>
                  )}
                </svg>
              </button>
            </div>

            <div className={`text-[12px] text-center max-w-[240px] min-h-[15px] leading-[1.3] ${
              micState === 'listening' ? 'text-[#4a7c59] font-medium' :
              micState === 'speaking' ? 'text-[#c4956a] font-medium' :
              'text-[#7a6f65]'
            }`}>
              {micState === 'listening'
                ? (liveTranscript || 'Listening… tap to send')
                : micState === 'speaking' ? 'Sage is speaking…'
                : micState === 'thinking' ? 'Thinking…'
                : 'Tap to speak'}
            </div>
            <div className="text-[10.5px] text-[#7a6f65] text-center">Audio is never stored — only your words are saved</div>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap gap-[6px] mb-2">
              {getQuickReplies().map((qr, i) => (
                <button
                  key={i}
                  className="py-1.5 px-3 bg-[#e8f0eb] border-[0.5px] border-[#8fb99a] rounded-[20px] text-[12px] text-[#4a7c59] cursor-pointer font-sans hover:bg-[#8fb99a] hover:text-white transition-colors"
                  onClick={() => handleUserMessage(qr)}
                >
                  {qr}
                </button>
              ))}
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                className="flex-1 p-2.5 px-3.5 bg-[#f0ece4] border-[0.5px] border-[#ccc8c0] rounded-[20px] font-sans text-[13px] text-[#2e2a25] outline-none resize-none min-h-[38px] max-h-[70px] leading-[1.4] focus:border-[#8fb99a] placeholder:text-[#7a6f65]"
                placeholder="Share what's on your mind…"
                rows={1}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  e.currentTarget.style.height = 'auto';
                  e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 70) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSend(); }
                }}
                data-testid="chat-input"
              />
              <button
                className={`w-[38px] h-[38px] rounded-full border-none flex items-center justify-center shrink-0 transition-colors ${inputValue.trim() ? 'bg-[#4a7c59] cursor-pointer' : 'bg-[#b8c9bc] cursor-not-allowed'}`}
                disabled={!inputValue.trim()}
                onClick={handleTextSend}
                data-testid="send-button"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8L2 2l2.5 6L2 14l12-6z" fill="white"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
