import React, { useState } from "react";
import { useMissionStore } from "./MissionStore";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableRoleItem: React.FC<{ role: { id: string; name: string; icon: string }; goalCount: number }> = ({ role, goalCount }) => {
  const selectedRoleId = useMissionStore(s => s.selectedRoleId);
  const setSelectedRole = useMissionStore(s => s.setSelectedRole);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: role.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`role-item ${selectedRoleId === role.id ? "active" : ""}`}
      onClick={() => setSelectedRole(role.id)}
      {...attributes}
      {...listeners}
    >
      <span className="role-icon">{role.icon}</span>
      <span className="role-name">{role.name}</span>
      <span className="role-count">{goalCount} 个目标</span>
    </div>
  );
};

export const RoleSidebar: React.FC = () => {
  const roles = useMissionStore(s => s.roles);
  const goals = useMissionStore(s => s.goals);
  const addRole = useMissionStore(s => s.addRole);
  const reorderRoles = useMissionStore(s => s.reorderRoles);
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (newName.trim()) {
      addRole(newName.trim(), "🎯");
      setNewName("");
      setIsAdding(false);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = roles.findIndex(r => r.id === active.id);
    const newIndex = roles.findIndex(r => r.id === over.id);
    const newOrder = arrayMove(roles, oldIndex, newIndex).map(r => r.id);
    reorderRoles(newOrder);
  };

  return (
    <div className="role-sidebar">
      <div className="role-sidebar-header">
        <span className="role-sidebar-title">角色</span>
        <button className="role-add-btn" onClick={() => setIsAdding(true)}>+</button>
      </div>
      {isAdding && (
        <div className="role-add-input">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            onBlur={() => { if (!newName.trim()) setIsAdding(false); }}
            placeholder="角色名称"
          />
        </div>
      )}
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={roles.map(r => r.id)} strategy={verticalListSortingStrategy}>
          {roles.map(role => (
            <SortableRoleItem
              key={role.id}
              role={role}
              goalCount={goals.filter(g => g.roleId === role.id).length}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};
