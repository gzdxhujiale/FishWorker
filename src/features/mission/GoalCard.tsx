import React, { useState } from "react";
import type { Goal, GoalStatus, TimeScope } from "./MissionTypes";
import { GOAL_STATUS_LABELS, TIME_SCOPE_LABELS } from "./MissionTypes";
import { useMissionStore } from "./MissionStore";

const STATUS_COLORS: Record<GoalStatus, string> = {
  not_started: "#d93025",
  in_progress: "#1e8e3e",
  completed: "#5f6368",
  abandoned: "#9aa0a6",
};

export const GoalCard: React.FC<{ goal: Goal }> = ({ goal }) => {
  const updateGoal = useMissionStore(s => s.updateGoal);
  const deleteGoal = useMissionStore(s => s.deleteGoal);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);

  const handleStatusCycle = () => {
    const cycle: GoalStatus[] = ["not_started", "in_progress", "completed"];
    const idx = cycle.indexOf(goal.status);
    const next = cycle[(idx + 1) % cycle.length];
    updateGoal(goal.id, { status: next });
  };

  const handleTimeScopeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateGoal(goal.id, { timeScope: e.target.value as TimeScope });
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== goal.title) {
      updateGoal(goal.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div className="goal-card">
      <div className="goal-card-main">
        {isEditing ? (
          <input
            className="goal-edit-input"
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSaveTitle()}
            onBlur={handleSaveTitle}
            autoFocus
          />
        ) : (
          <span className="goal-title" onDoubleClick={() => setIsEditing(true)}>
            {goal.title}
          </span>
        )}
        <span
          className="goal-status-badge"
          style={{ background: `${STATUS_COLORS[goal.status]}20`, color: STATUS_COLORS[goal.status] }}
          onClick={handleStatusCycle}
          title="点击切换状态"
        >
          {GOAL_STATUS_LABELS[goal.status]}
        </span>
      </div>
      <div className="goal-card-footer">
        <select
          className="goal-time-scope"
          value={goal.timeScope}
          onChange={handleTimeScopeChange}
        >
          {Object.entries(TIME_SCOPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button className="goal-delete-btn" onClick={() => deleteGoal(goal.id)} title="删除目标">
          ×
        </button>
      </div>
    </div>
  );
};
