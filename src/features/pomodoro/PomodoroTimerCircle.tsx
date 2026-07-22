import React from 'react';
import { ChevronRight, RotateCcw, Pause, CheckCircle2 } from 'lucide-react';
import { usePomodoroStore } from './pomodoroStore';

interface PomodoroTimerCircleProps {
  onTogglePhase?: () => void;
}

export const PomodoroTimerCircle: React.FC<PomodoroTimerCircleProps> = ({ onTogglePhase }) => {
  const {
    mode,
    phase,
    isRunning,
    timeLeft,
    totalTargetSeconds,
    stopwatchSeconds,
    startTimer,
    pauseTimer,
    resetTimer,
    finishCurrentSession,
    setPhase,
  } = usePomodoroStore();

  // Format time MM:SS
  const displaySeconds = mode === 'stopwatch' ? stopwatchSeconds : timeLeft;
  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Progress percentage (0 to 1)
  const progress = mode === 'stopwatch' 
    ? (stopwatchSeconds % 60) / 60 
    : (totalTargetSeconds - timeLeft) / totalTargetSeconds;

  // SVG Circle parameters
  const size = 320;
  const strokeWidth = 8;
  const center = size / 2;
  const radius = center - strokeWidth * 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progress * circumference;

  const handlePrimaryClick = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const handlePhaseSwitch = () => {
    if (onTogglePhase) {
      onTogglePhase();
    } else {
      const nextPhase = phase === 'focus' ? 'break' : 'focus';
      setPhase(nextPhase);
    }
  };

  return (
    <div className="pomodoro-timer-container">
      {/* Sub-label / Mode Breadcrumb */}
      <button 
        className="pomodoro-phase-badge" 
        onClick={handlePhaseSwitch} 
        title="点击切换 专注/休息 模式"
      >
        <span>{phase === 'focus' ? '专注' : '休息'}</span>
        <ChevronRight size={16} className="badge-chevron" />
      </button>

      {/* Circular Progress Ring */}
      <div className="pomodoro-circle-wrapper">
        <svg className="pomodoro-circle-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background Outer Glow Track */}
          <circle
            className="pomodoro-circle-bg-glow"
            cx={center}
            cy={center}
            r={radius + 4}
            strokeWidth="1"
          />
          {/* Main Background Track */}
          <circle
            className="pomodoro-circle-bg"
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
          />
          {/* Dynamic Animated Progress Ring */}
          <circle
            className={`pomodoro-circle-progress ${phase === 'break' ? 'is-break' : ''}`}
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </svg>

        {/* Center Digital Clock */}
        <div className="pomodoro-timer-content">
          <div className="pomodoro-clock-text">{timeString}</div>
        </div>
      </div>

      {/* Controls Area */}
      <div className="pomodoro-controls">
        <button
          className={`pomodoro-start-btn ${isRunning ? 'is-running' : ''}`}
          onClick={handlePrimaryClick}
        >
          {isRunning ? (
            <>
              <Pause size={18} fill="currentColor" />
              <span>暂停</span>
            </>
          ) : (
            <>
              <span>{displaySeconds === totalTargetSeconds || stopwatchSeconds === 0 ? '开始' : '继续'}</span>
            </>
          )}
        </button>

        {/* Secondary Action Controls when running/paused */}
        {(isRunning || displaySeconds !== totalTargetSeconds || stopwatchSeconds > 0) && (
          <div className="pomodoro-sub-controls">
            <button
              className="pomodoro-icon-btn"
              onClick={resetTimer}
              title="重置计时"
            >
              <RotateCcw size={16} />
              <span>重置</span>
            </button>

            <button
              className="pomodoro-icon-btn"
              onClick={finishCurrentSession}
              title="完成并记录"
            >
              <CheckCircle2 size={16} />
              <span>完成</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
