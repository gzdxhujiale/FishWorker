import React from 'react';
import { Timer, Play, Pause, Maximize2 } from 'lucide-react';
import { usePomodoroStore } from './pomodoroStore';

interface MiniTimerBarProps {
  onExpandCircleView: () => void;
}

export const MiniTimerBar: React.FC<MiniTimerBarProps> = ({ onExpandCircleView }) => {
  const {
    phase,
    mode,
    isRunning,
    timeLeft,
    stopwatchSeconds,
    startTimer,
    pauseTimer,
  } = usePomodoroStore();

  const displaySecs = mode === 'stopwatch' ? stopwatchSeconds : timeLeft;
  const mins = Math.floor(displaySecs / 60);
  const secs = displaySecs % 60;
  const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  return (
    <div className="mini-timer-bar-container" onClick={onExpandCircleView}>
      {/* Left: Icon + Phase Label + Digital Clock */}
      <div className="mini-timer-left">
        <div className="mini-timer-icon-circle">
          <Timer size={16} fill="currentColor" />
        </div>
        <div className="mini-timer-text-group">
          <span className="mini-timer-phase-label">{phase === 'focus' ? '专注' : '休息'}</span>
          <span className="mini-timer-clock">{timeString}</span>
        </div>
      </div>

      {/* Right: Expand & Play/Pause Button */}
      <div className="mini-timer-right">
        <button
          type="button"
          className="mini-timer-expand-btn"
          onClick={onExpandCircleView}
          title="展开环形计时器"
        >
          <Maximize2 size={14} />
        </button>

        <button
          type="button"
          className={`mini-timer-play-btn ${isRunning ? 'is-running' : ''}`}
          onClick={handlePlayToggle}
          title={isRunning ? '暂停' : '开始'}
        >
          {isRunning ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
      </div>
    </div>
  );
};
