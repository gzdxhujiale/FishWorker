import React, { useEffect, useState } from 'react';
import { Plus, MoreHorizontal, Settings, ArrowLeft } from 'lucide-react';
import { requestNotificationPermission, usePomodoroStore } from './pomodoroStore';
import { PomodoroTimerCircle } from './PomodoroTimerCircle';
import { PomodoroOverview } from './PomodoroOverview';
import { PomodoroHistory } from './PomodoroHistory';
import { FavoriteTaskList } from './FavoriteTaskList';
import { FavoriteTaskModal } from './FavoriteTaskModal';
import { MiniTimerBar } from './MiniTimerBar';
import './pomodoro.css';

export const PomodoroPanel: React.FC = () => {
  const {
    mode,
    phase,
    isRunning,
    focusDuration,
    breakDuration,
    minEffectiveMinutes,
    activeTab,
    favoriteTasks,
    setMode,
    setPhase,
    setActiveTab,
    setFocusDuration,
    setBreakDuration,
    setMinEffectiveMinutes,
    getActiveFavoriteTasks,
    getArchivedFavoriteTasks,
    syncAllFromDB,
  } = usePomodoroStore();

  const [showAddFavModal, setShowAddFavModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExpandedCircle, setShowExpandedCircle] = useState(false);

  const [customFocusMins, setCustomFocusMins] = useState(Math.round(focusDuration / 60));
  const [customBreakMins, setCustomBreakMins] = useState(Math.round(breakDuration / 60));
  const [customMinEffectiveMins, setCustomMinEffectiveMins] = useState(minEffectiveMinutes);

  const activeFavTasks = getActiveFavoriteTasks();
  const archivedFavTasks = getArchivedFavoriteTasks();
  const hasFavTasks = favoriteTasks.length > 0;

  // Sync data & request notification permission on mount
  useEffect(() => {
    syncAllFromDB();
    requestNotificationPermission();
  }, [syncAllFromDB]);

  useEffect(() => {
    if (showSettingsModal) {
      setCustomFocusMins(Math.round(focusDuration / 60));
      setCustomBreakMins(Math.round(breakDuration / 60));
      setCustomMinEffectiveMins(minEffectiveMinutes);
    }
  }, [showSettingsModal, focusDuration, breakDuration, minEffectiveMinutes]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setFocusDuration(customFocusMins);
    setBreakDuration(customBreakMins);
    setMinEffectiveMinutes(customMinEffectiveMins);
    setShowSettingsModal(false);
  };

  return (
    <div className="pomodoro-panel-container">
      {/* Header Bar */}
      <header className="pomodoro-header">
        <div className="header-left">
          {showExpandedCircle ? (
            <button
              className="header-back-btn"
              onClick={() => setShowExpandedCircle(false)}
              title="返回专注任务列表"
            >
              <ArrowLeft size={18} />
              <span>返回列表</span>
            </button>
          ) : (
            <h1 className="header-title">番茄专注</h1>
          )}
        </div>

        {/* Mode / View Switch Pills */}
        <div className="header-center">
          {hasFavTasks && !showExpandedCircle ? (
            /* Screenshot 2 Header Tabs: [ 坚持中 | 已归档 ] */
            <div className="mode-pill-switch">
              <button
                className={`pill-btn ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                坚持中
              </button>
              <button
                className={`pill-btn ${activeTab === 'archived' ? 'active' : ''}`}
                onClick={() => setActiveTab('archived')}
              >
                已归档
              </button>
            </div>
          ) : (
            /* Standard Mode Switch Pills: [ 番茄计时 | 正计时 ] */
            <div className="mode-pill-switch">
              <button
                className={`pill-btn ${mode === 'pomodoro' ? 'active' : ''}`}
                onClick={() => !isRunning && setMode('pomodoro')}
                disabled={isRunning}
                title={isRunning ? '计时进行中，无法切换模式' : '番茄计时模式'}
                style={{
                  opacity: isRunning && mode !== 'pomodoro' ? 0.5 : 1,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                }}
              >
                番茄计时
              </button>
              <button
                className={`pill-btn ${mode === 'stopwatch' ? 'active' : ''}`}
                onClick={() => !isRunning && setMode('stopwatch')}
                disabled={isRunning}
                title={isRunning ? '计时进行中，无法切换模式' : '正计时模式'}
                style={{
                  opacity: isRunning && mode !== 'stopwatch' ? 0.5 : 1,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                }}
              >
                正计时
              </button>
            </div>
          )}
        </div>

        <div className="header-right">
          <button
            className="header-icon-btn"
            onClick={() => setShowAddFavModal(true)}
            title="添加常用专注"
          >
            <Plus size={19} />
          </button>
          <button
            className="header-icon-btn"
            onClick={() => setShowSettingsModal(true)}
            title="专注设置"
          >
            <MoreHorizontal size={19} />
          </button>
        </div>
      </header>

      {/* Main Body - Split Layout */}
      <div className="pomodoro-body">
        {/* Left Main Area */}
        <div className="pomodoro-main-area">
          {hasFavTasks && !showExpandedCircle ? (
            /* Favorite Focus Task List Area matching Screenshot 2 */
            <div className="fav-task-list-view-wrapper">
              <FavoriteTaskList
                tasks={activeTab === 'active' ? activeFavTasks : archivedFavTasks}
                isArchivedView={activeTab === 'archived'}
              />

              {/* Bottom Mini Timer Bar */}
              <MiniTimerBar onExpandCircleView={() => setShowExpandedCircle(true)} />
            </div>
          ) : (
            /* Full Circular Timer Area */
            <PomodoroTimerCircle
              onTogglePhase={() => {
                const nextPhase = phase === 'focus' ? 'break' : 'focus';
                setPhase(nextPhase);
              }}
            />
          )}
        </div>

        {/* Right Sidebar Area (Overview & History) */}
        <aside className="pomodoro-sidebar-area">
          <PomodoroOverview />
          <PomodoroHistory />
        </aside>
      </div>

      {/* Add Favorite Task Modal */}
      {showAddFavModal && (
        <FavoriteTaskModal onClose={() => setShowAddFavModal(false)} />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="pomodoro-modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="pomodoro-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <Settings size={18} />
              <h4>番茄专注设置</h4>
            </div>
            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label>专注时长 (分钟)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customFocusMins}
                  onChange={(e) => setCustomFocusMins(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>休息时长 (分钟)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={customBreakMins}
                  onChange={(e) => setCustomBreakMins(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>最小计入专注时长 (分钟)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={customMinEffectiveMins}
                  onChange={(e) => setCustomMinEffectiveMins(Number(e.target.value))}
                />
                <span className="form-hint">专注小于此分钟数时不计入专注记录与累计时长（默认 5 分钟）</span>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowSettingsModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn-confirm">
                  保存设置
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
