import React, { useState } from 'react';
import { Plus, MoreHorizontal, Timer, Trash2 } from 'lucide-react';
import { usePomodoroStore } from './pomodoroStore';
import { PomodoroRecord } from './pomodoroTypes';

export const PomodoroHistory: React.FC = () => {
  const { records, deleteRecord, addManualRecord, clearAllRecords } = usePomodoroStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [manualMins, setManualMins] = useState(25);

  // Group records by dateLabel (e.g. "7月22日", "7月21日")
  const groupedRecords = React.useMemo(() => {
    const groups: { [key: string]: PomodoroRecord[] } = {};
    records.forEach((rec) => {
      const label = rec.dateLabel || '近期';
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(rec);
    });
    return Object.entries(groups).map(([dateLabel, items]) => ({
      dateLabel,
      items,
    }));
  }, [records]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualMins > 0) {
      addManualRecord(manualMins);
      setShowAddModal(false);
    }
  };

  const formatDurationText = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  };

  return (
    <div className="pomodoro-history-section">
      {/* Section Header */}
      <div className="history-header">
        <h3 className="history-title">专注记录</h3>
        <div className="history-actions">
          <button
            className="history-icon-btn"
            onClick={() => setShowAddModal(true)}
            title="补录专注时长"
          >
            <Plus size={18} />
          </button>
          <div className="history-menu-wrapper">
            <button
              className="history-icon-btn"
              onClick={() => setShowMenu(!showMenu)}
              title="记录选项"
            >
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div className="history-dropdown-menu">
                <button
                  className="dropdown-item danger"
                  onClick={() => {
                    if (confirm('确认清空所有历史专注记录？')) {
                      clearAllRecords();
                    }
                    setShowMenu(false);
                  }}
                >
                  <Trash2 size={14} />
                  <span>清空历史记录</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grouped Timeline */}
      <div className="history-timeline-list">
        {groupedRecords.length === 0 ? (
          <div className="history-empty">暂无专注记录</div>
        ) : (
          groupedRecords.map((group) => (
            <div key={group.dateLabel} className="timeline-group">
              <div className="timeline-group-date">{group.dateLabel}</div>
              <div className="timeline-items">
                {group.items.map((item, index) => (
                  <div key={item.id} className="timeline-item">
                    {/* Timeline Line Connector */}
                    {index < group.items.length - 1 && <div className="timeline-line" />}

                    {/* Timeline Node Icon */}
                    <div className="timeline-node">
                      <div className="node-icon-bg">
                        <Timer size={13} className="node-icon" />
                      </div>
                    </div>

                    {/* Timeline Content */}
                    <div className="timeline-content">
                      <div className="timeline-main-info">
                        <span className="timeline-time">{item.timeRangeLabel || `${item.startTime} - ${item.endTime}`}</span>
                        {item.linkedTarget && (
                          <div className="timeline-linked-subnode">
                            <span className="subnode-dot">o</span>
                            <span className="subnode-title">{item.linkedTarget.title}</span>
                          </div>
                        )}
                      </div>
                      <span className="timeline-duration">{formatDurationText(item.durationMinutes)}</span>
                    </div>

                    {/* Delete Item Hover Button */}
                    <button
                      className="item-delete-btn"
                      onClick={() => deleteRecord(item.id)}
                      title="删除此记录"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manual Add Modal */}
      {showAddModal && (
        <div className="pomodoro-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="pomodoro-modal" onClick={(e) => e.stopPropagation()}>
            <h4>补录专注时长</h4>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>专注时长（分钟）</label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={manualMins}
                  onChange={(e) => setManualMins(Number(e.target.value))}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn-confirm">
                  确定添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
