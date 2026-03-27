import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../i18n';

// Singleton AudioContext - initialized on first user interaction
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!audioContext) {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContext = new AudioContextClass();
    } catch {
      return null;
    }
  }
  return audioContext;
}

function playChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume if suspended (browser policy)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const playTone = (frequency: number, delay: number, duration: number) => {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    const startTime = ctx.currentTime + delay;
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  };

  // Two-tone gentle chime
  playTone(880, 0, 0.5);
  playTone(1175, 0.2, 0.6);
}

interface TimerProps {
  durationMinutes: number;
  onComplete: (elapsedSeconds: number) => void;
  onCancel: () => void;
}

export default function Timer({ durationMinutes, onComplete, onCancel }: TimerProps) {
  const { t } = useLanguage();
  const totalSeconds = durationMinutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(true);
  const [isPausedByVisibility, setIsPausedByVisibility] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const elapsedRef = useRef(0);

  // Initialize AudioContext on mount (user already clicked to start timer)
  useEffect(() => {
    getAudioContext();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPausedByVisibility(true);
      } else {
        setIsPausedByVisibility(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!isRunning || isPausedByVisibility || isCompleted) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          elapsedRef.current = totalSeconds;
          setIsCompleted(true);
          return 0;
        }
        elapsedRef.current = totalSeconds - prev + 1;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPausedByVisibility, isCompleted, totalSeconds]);

  // Play chime and complete when timer finishes
  useEffect(() => {
    if (isCompleted) {
      playChime();
      onComplete(totalSeconds);
    }
  }, [isCompleted, onComplete, totalSeconds]);

  const handleFinishEarly = useCallback(() => {
    const elapsed = totalSeconds - secondsLeft;
    onComplete(elapsed);
  }, [totalSeconds, secondsLeft, onComplete]);

  const togglePause = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / (durationMinutes * 60);

  const isPaused = !isRunning || isPausedByVisibility;

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative w-48 h-48 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-themed-faint"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${progress * 283} 283`}
            className="text-themed-accent-solid transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-4xl text-themed-primary">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          {isPaused && (
            <span className="text-sm text-themed-faint mt-1">
              {isPausedByVisibility ? t.timer.pageInactive : t.timer.paused}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <div className="flex gap-3">
          <button
            onClick={togglePause}
            className="flex-1 px-4 py-2 rounded-xl bg-themed-input text-themed-secondary hover:bg-themed-input transition-colors"
          >
            {isRunning ? t.timer.pause : t.timer.resume}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-xl text-themed-faint hover:text-themed-secondary transition-colors"
          >
            {t.timer.cancel}
          </button>
        </div>
        <button
          onClick={handleFinishEarly}
          className="w-full px-4 py-2 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--accent-solid)', color: 'var(--accent-text-on-solid)' }}
        >
          {t.timer.finishEarly}
        </button>
      </div>
    </div>
  );
}
