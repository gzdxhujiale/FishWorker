import React, { useState, useEffect, useRef } from 'react';
import { Link2, Pencil, Check, X, LayoutGrid, Flame } from 'lucide-react';
import { usePomodoroStore } from './pomodoroStore';
import { FavoriteFocusTask, LinkedTarget, PomodoroMode } from './pomodoroTypes';
import { useTimeStore } from '../time-management/timeManagementStore';
import { useHabitStore } from '../habit/habitStore';

interface FavoriteTaskModalProps {
  initialTask?: FavoriteFocusTask | null;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['😊', '🎯', '⚡', '📚', '💻', '🎨', '🔥', '🧠', '🎧', '☕'];

export const FavoriteTaskModal: React.FC<FavoriteTaskModalProps> = ({ initialTask, onClose }) => {
  const { addFavoriteTask, updateFavoriteTask } = usePomodoroStore();

  const timeTasks = useTimeStore((state) => state.data.tasks);
  const habits = useHabitStore((state) => state.habits);

  const [name, setName] = useState(initialTask?.name || '');
  const [icon, setIcon] = useState(initialTask?.icon || '😊');
  const [mode, setMode] = useState<PomodoroMode>(initialTask?.mode || 'pomodoro');
  const [durationMinutes, setDurationMinutes] = useState(initialTask?.durationMinutes || 25);
  const [linkedTarget, setLinkedTarget] = useState<LinkedTarget | undefined>(initialTask?.linkedTarget);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);
  const [linkTab, setLinkTab] = useState<'quadrant' | 'habit'>('quadrant');

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync data from stores on mount
  useEffect(() => {
    useTimeStore.getState().syncAllFromDB();
    useHabitStore.getState().loadAll();
  }, []);

  // Close dropdown when clicking outside dropdownRef
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLinkDropdown(false);
      }
    };
    if (showLinkDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLinkDropdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (initialTask) {
      updateFavoriteTask(initialTask.id, {
        name: name.trim(),
        icon,
        mode,
        durationMinutes,
        linkedTarget,
      });
    } else {
      addFavoriteTask({
        name: name.trim(),
        icon,
        mode,
        durationMinutes,
        linkedTarget,
      });
    }

    onClose();
  };

  const handleSelectLinkedTarget = (target: LinkedTarget) => {
    setLinkedTarget(target);
    if (!name.trim()) {
      setName(target.title);
    }
    setShowLinkDropdown(false);
  };

  return (
    <div className="pomodoro-modal-backdrop" onClick={onClose}>
      <div className="favorite-task-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{initialTask ? '编辑常用专注' : '添加常用专注'}</h3>

        <form onSubmit={handleSubmit}>
          {/* Main Top Row: Icon Avatar + Name Input with Link Icon */}
          <div className="fav-input-row">
            {/* Avatar & Emoji Picker */}
            <div className="fav-avatar-wrapper">
              <button
                type="button"
                className="fav-avatar-btn"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowLinkDropdown(false);
                }}
                title="更换图标"
              >
                <span className="fav-avatar-emoji">{icon}</span>
                <span className="fav-avatar-pencil">
                  <Pencil size={10} />
                </span>
              </button>

              {/* Emoji Picker Dropdown */}
              {showEmojiPicker && (
                <div className="emoji-picker-popover">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      className={`emoji-option ${icon === e ? 'active' : ''}`}
                      onClick={() => {
                        setIcon(e);
                        setShowEmojiPicker(false);
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input Name Field with Link Dropdown Toggle */}
            <div className="fav-name-input-wrapper" ref={dropdownRef}>
              <input
                type="text"
                className="fav-name-input"
                placeholder="名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
              <button
                type="button"
                className={`fav-link-btn ${linkedTarget || showLinkDropdown ? 'has-link' : ''}`}
                onClick={() => {
                  setShowLinkDropdown(!showLinkDropdown);
                  setShowEmojiPicker(false);
                }}
                title={linkedTarget ? `已关联: ${linkedTarget.title}` : '关联四象限任务或习惯追踪'}
              >
                <Link2 size={16} />
              </button>

              {/* Link Target Selector Dropdown Popover */}
              {showLinkDropdown && (
                <div className="link-dropdown-popover">
                  <div className="link-dropdown-tabs">
                    <button
                      type="button"
                      className={`link-tab ${linkTab === 'quadrant' ? 'active' : ''}`}
                      onClick={() => setLinkTab('quadrant')}
                    >
                      <LayoutGrid size={13} />
                      <span>四象限 ({timeTasks.filter((t) => !t.completed).length})</span>
                    </button>
                    <button
                      type="button"
                      className={`link-tab ${linkTab === 'habit' ? 'active' : ''}`}
                      onClick={() => setLinkTab('habit')}
                    >
                      <Flame size={13} />
                      <span>习惯追踪 ({habits.length})</span>
                    </button>
                  </div>

                  {/* Options List */}
                  <div className="link-dropdown-list">
                    {linkTab === 'quadrant' ? (
                      timeTasks.filter((t) => !t.completed).length === 0 ? (
                        <div className="link-empty-item">暂无未完成的四象限任务</div>
                      ) : (
                        timeTasks
                          .filter((t) => !t.completed)
                          .map((task) => (
                            <div
                              key={task.id}
                              className={`link-dropdown-item ${
                                linkedTarget?.id === task.id ? 'selected' : ''
                              }`}
                              onClick={() =>
                                handleSelectLinkedTarget({
                                  type: 'quadrant',
                                  id: task.id,
                                  title: task.title,
                                })
                              }
                            >
                              <span className="target-title">{task.title}</span>
                              <span className="target-badge">{task.quadrant}</span>
                              {linkedTarget?.id === task.id && (
                                <Check size={14} className="check-icon" />
                              )}
                            </div>
                          ))
                      )
                    ) : habits.length === 0 ? (
                      <div className="link-empty-item">暂无习惯项目</div>
                    ) : (
                      habits.map((habit) => (
                        <div
                          key={habit.id}
                          className={`link-dropdown-item ${
                            linkedTarget?.id === habit.id ? 'selected' : ''
                          }`}
                          onClick={() =>
                            handleSelectLinkedTarget({
                              type: 'habit',
                              id: habit.id,
                              title: habit.name,
                            })
                          }
                        >
                          <span className="target-title">{habit.name}</span>
                          <span className="target-badge">习惯</span>
                          {linkedTarget?.id === habit.id && (
                            <Check size={14} className="check-icon" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Linked Tag Badge if set */}
          {linkedTarget && (
            <div className="linked-tag-bar">
              <span className="linked-tag-label">
                {linkedTarget.type === 'quadrant' ? '关联四象限: ' : '关联习惯: '}
                <strong>{linkedTarget.title}</strong>
              </span>
              <button
                type="button"
                className="linked-tag-remove"
                onClick={() => setLinkedTarget(undefined)}
                title="解除关联"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Timing Mode Section */}
          <div className="fav-mode-section">
            <div className="section-subtitle">计时模式</div>

            <div className="mode-radio-group">
              {/* Pomodoro Mode Option */}
              <label className="mode-radio-label">
                <input
                  type="radio"
                  name="timingMode"
                  checked={mode === 'pomodoro'}
                  onChange={() => setMode('pomodoro')}
                />
                <span className="radio-custom" />
                <span className="mode-text">番茄计时</span>
                {mode === 'pomodoro' && (
                  <div className="duration-input-inline">
                    <input
                      type="number"
                      min="1"
                      max="180"
                      className="duration-num-input"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                    />
                    <span className="unit-text">分钟</span>
                  </div>
                )}
              </label>

              {/* Stopwatch Mode Option */}
              <label className="mode-radio-label">
                <input
                  type="radio"
                  name="timingMode"
                  checked={mode === 'stopwatch'}
                  onChange={() => setMode('stopwatch')}
                />
                <span className="radio-custom" />
                <span className="mode-text">正计时</span>
              </label>
            </div>
          </div>

          {/* Modal Bottom Action Buttons */}
          <div className="fav-modal-footer">
            <button type="submit" className="fav-btn-save">
              保存
            </button>
            <button type="button" className="fav-btn-cancel" onClick={onClose}>
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
