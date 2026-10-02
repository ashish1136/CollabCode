import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useSpeechTranscription
 *
 * Provides live speech-to-text with:
 * - Continuous recognition + auto-restart (survives the ~60s Chrome timeout)
 * - Debounced sentence buffer: accumulates word-by-word results into full
 *   paragraphs before committing a transcript line (fixes Chrome's habit of
 *   finalising one word at a time during brief pauses)
 * - Speaker-labelled, timestamped lines: "[10:04 AM] Alice: hello everyone"
 * - Mic-mute pause / resume
 * - isSupported flag for graceful degradation
 */
export const useSpeechTranscription = ({ username, micOn = true }) => {
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef  = useRef(null);
  const restartTimerRef = useRef(null);
  const flushTimerRef   = useRef(null);   // debounce timer to flush the word buffer
  const sentenceBuffer  = useRef('');     // accumulates finalized words between pauses
  const activeRef       = useRef(false);
  const micOnRef        = useRef(micOn);

  useEffect(() => { micOnRef.current = micOn; }, [micOn]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SR);
  }, []);

  // ── Flush the sentence buffer as a single transcript line ─────────────────
  const flushBuffer = useCallback(() => {
    const text = sentenceBuffer.current.trim();
    if (!text) return;
    sentenceBuffer.current = '';
    clearTimeout(flushTimerRef.current);

    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const entry = `[${timestamp}] ${username || 'Me'}: ${text}\n`;
    setTranscript((prev) => (prev ? `${prev}${entry}` : entry));
    setInterimText('');
  }, [username]);

  // ── Schedule a flush after 1.8 s of silence ───────────────────────────────
  const scheduledFlush = useCallback(() => {
    clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(flushBuffer, 1800);
  }, [flushBuffer]);

  // ── Start / restart the recognition engine ────────────────────────────────
  const startRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    // Stop any existing instance first
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    const recognition = new SR();
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.lang            = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text   = result[0].transcript;

        if (result.isFinal) {
          // Append to the running sentence buffer
          const word = text.trim();
          if (word) {
            sentenceBuffer.current =
              sentenceBuffer.current
                ? `${sentenceBuffer.current} ${word}`
                : word;
            // Reset the flush countdown every time a new word arrives
            scheduledFlush();
          }
        } else {
          interim += text;
        }
      }

      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      // Critical errors — stop entirely
      if (
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed'
      ) {
        activeRef.current = false;
        setIsListening(false);
      }
      // 'no-speech', 'network', 'aborted' → let onend handle the restart
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');

      // Flush whatever is buffered if recognition ended mid-sentence
      if (sentenceBuffer.current.trim()) {
        flushBuffer();
      }

      // Auto-restart if we still want to be active
      if (activeRef.current && micOnRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (activeRef.current && micOnRef.current) {
            try { recognitionRef.current && recognitionRef.current.start(); } catch (_) {}
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (_) {}
  }, [username, flushBuffer, scheduledFlush]); // eslint-disable-line

  const stopRecognition = useCallback(() => {
    activeRef.current = false;
    clearTimeout(restartTimerRef.current);
    clearTimeout(flushTimerRef.current);
    // Flush anything remaining before stopping
    if (sentenceBuffer.current.trim()) {
      flushBuffer();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  }, [flushBuffer]);

  // ── Start on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    activeRef.current = true;
    startRecognition();
    return () => stopRecognition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pause / resume when mic is toggled ────────────────────────────────────
  useEffect(() => {
    if (!isSupported) return;
    if (!micOn) {
      activeRef.current = false;
      clearTimeout(restartTimerRef.current);
      clearTimeout(flushTimerRef.current);
      if (sentenceBuffer.current.trim()) flushBuffer();
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
      }
      setIsListening(false);
      setInterimText('');
    } else {
      activeRef.current = true;
      startRecognition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [micOn]);

  const clearTranscript = useCallback(() => {
    sentenceBuffer.current = '';
    clearTimeout(flushTimerRef.current);
    setTranscript('');
    setInterimText('');
  }, []);

  return {
    transcript,
    interimText,
    isListening,
    isSupported,
    clearTranscript,
    stopTranscription: stopRecognition,
  };
};
