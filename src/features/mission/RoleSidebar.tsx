import React, { useState } from "react";
import { useMissionStore } from "./MissionStore";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useConfirmDialog } from "../../components/ui/ConfirmDeleteDialog";

const SortableRoleItem: React.FC<{ role: { id: string; name: string; icon: string }; goalCount: number }> = ({ role, goalCount }) => {
  const selectedRoleId = useMissionStore(s => s.selectedRoleId);
  const setSelectedRole = useMissionStore(s => s.setSelectedRole);
  const updateRole = useMissionStore(s => s.updateRole);
  const deleteRole = useMissionStore(s => s.deleteRole);
  const { confirm: confirmDelete } = useConfirmDialog();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: role.id });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(role.name);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = () => {
    if (!isEditing) {
      setSelectedRole(role.id);
    }
  };

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(role.name);
    setIsEditing(true);
  };

  const handleConfirmEdit = () => {
    if (editName.trim()) {
      updateRole(role.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(role.name);
    setIsEditing(false);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirmDelete({
      title: '删除角色',
      description: `确定删除角色「${role.name}」？相关目标也会被删除。`,
      confirmText: '删除',
    });
    if (confirmed) {
      deleteRole(role.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`role-item ${selectedRoleId === role.id ? "active" : ""}`}
      onClick={handleClick}
    >
      <span className="role-drag-handle" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </span>
      <span className="role-icon">{role.icon}</span>
      {isEditing ? (
        <input
          className="role-edit-input"
          autoFocus
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") handleConfirmEdit();
            if (e.key === "Escape") handleCancelEdit();
          }}
          onClick={e => e.stopPropagation()}
          onBlur={handleConfirmEdit}
        />
      ) : (
        <span className="role-name">{role.name}</span>
      )}
      <span className="role-count">{goalCount}</span>
      <div className="role-actions">
        <button className="role-action-btn" onClick={handleStartEdit} title="重命名">
          <Pencil size={12} />
        </button>
        <button className="role-action-btn role-action-delete" onClick={handleDelete} title="删除">
          <Trash2 size={12} />
        </button>
      </div>
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
