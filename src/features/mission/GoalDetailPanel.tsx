import React, { useState } from "react";
import { useMissionStore } from "./MissionStore";
import { GoalCard } from "./GoalCard";

export const GoalDetailPanel: React.FC = () => {
  const selectedRoleId = useMissionStore(s => s.selectedRoleId);
  const roles = useMissionStore(s => s.roles);
  const goals = useMissionStore(s => s.goals);
  const addGoal = useMissionStore(s => s.addGoal);
  const [newTitle, setNewTitle] = useState("");

  const role = roles.find(r => r.id === selectedRoleId);
  const roleGoals = goals.filter(g => g.roleId === selectedRoleId);

  if (!role) {
    return (
      <div className="goal-detail-empty">
        <p>请选择一个角色，或添加新角色</p>
      </div>
    );
  }

  const handleAdd = () => {
    if (newTitle.trim()) {
      addGoal(newTitle.trim());
      setNewTitle("");
    }
  };

  return (
    <div className="goal-detail-panel">
      <div className="goal-detail-header">
        <span className="goal-detail-title">{role.icon} {role.name}</span>
        <div className="goal-add-row">
          <input
            className="goal-add-input"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="添加新目标..."
          />
          <button className="goal-add-btn" onClick={handleAdd}>+</button>
        </div>
      </div>
      <div className="goal-list">
        {roleGoals.map(goal => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
        {roleGoals.length === 0 && (
          <p className="goal-empty-hint">暂无目标，点击上方添加</p>
        )}
      </div>
    </div>
  );
};
