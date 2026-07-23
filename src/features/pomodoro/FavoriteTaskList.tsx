import React, { useState } from 'react';
import { Play, Edit3, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { usePomodoroStore } from './pomodoroStore';
import { FavoriteFocusTask } from './pomodoroTypes';
import { FavoriteTaskModal } from './FavoriteTaskModal';
import { useConfirmDialog } from '../../components/ui/ConfirmDeleteDialog';

interface FavoriteTaskListProps {
  tasks: FavoriteFocusTask[];
  isArchivedView?: boolean;
}

interface ContextMenuState {
  mouseX: number;
  mouseY: number;
  task: FavoriteFocusTask;
}

export const FavoriteTaskList: React.FC<FavoriteTaskListProps> = ({ tasks, isArchivedView }) => {
  const { startFavoriteTask, archiveFavoriteTask, unarchiveFavoriteTask, deleteFavoriteTask } =
    usePomodoroStore();
  const { confirm: confirmDelete } = useConfirmDialog();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingTask, setEditingTask] = useState<FavoriteFocusTask | null>(null);

  const handleContextMenu = (e: React.MouseEvent, task: FavoriteFocusTask) => {
    e.preventDefault();
    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      task,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <div className="fav-task-list-container" onClick={handleCloseContextMenu}>
      {tasks.length === 0 ? (
        <div className="fav-list-empty">
          {isArchivedView ? '暂无归档的专注任务' : '暂无常用专注任务，点击右上角 + 新增'}
        </div>
      ) : (
        <div className="fav-task-items">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="fav-task-item-row"
              onContextMenu={(e) => handleContextMenu(e, task)}
            >
              {/* Left Side: Avatar/Icon + Name */}
              <div className="item-left">
                <div className="item-avatar-circle">
                  <span className="item-emoji">{task.icon || '😊'}</span>
                </div>
                <div className="item-info">
                  <span className="item-name">{task.name}</span>
                  {task.linkedTarget && (
                    <span className="item-link-badge">
                      🔗 {task.linkedTarget.title}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: Accumulated Duration + Play Button */}
              <div className="item-right">
                <span className="item-duration-text">{task.accumulatedMinutes}m</span>
                {!isArchivedView && (
                  <button
                    type="button"
                    className="item-play-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      startFavoriteTask(task.id);
                    }}
                    title="立即开始专注"
                  >
                    <Play size={14} fill="currentColor" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          className="context-menu-popover"
          style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}
          onClick={(e) => e.stopPropagation()}
        >
          {!isArchivedView ? (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  setEditingTask(contextMenu.task);
                  handleCloseContextMenu();
                }}
              >
                <Edit3 size={14} />
                <span>编辑</span>
              </button>

              <button
                className="context-menu-item"
                onClick={() => {
                  archiveFavoriteTask(contextMenu.task.id);
                  handleCloseContextMenu();
                }}
              >
                <Archive size={14} />
                <span>归档</span>
              </button>

              <button
                className="context-menu-item danger"
                onClick={async () => {
                  const task = contextMenu.task;
                  handleCloseContextMenu();
                  const confirmed = await confirmDelete({
                    title: '删除专注任务',
                    description: `确认删除专注任务"${task.name}"？`,
                    confirmText: '删除',
                  });
                  if (confirmed) {
                    deleteFavoriteTask(task.id);
                  }
                }}
              >
                <Trash2 size={14} />
                <span>删除</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="context-menu-item"
                onClick={() => {
                  unarchiveFavoriteTask(contextMenu.task.id);
                  handleCloseContextMenu();
                }}
              >
                <ArchiveRestore size={14} />
                <span>恢复到专注列表</span>
              </button>

              <button
                className="context-menu-item danger"
                onClick={async () => {
                  const task = contextMenu.task;
                  handleCloseContextMenu();
                  const confirmed = await confirmDelete({
                    title: '删除专注任务',
                    description: `确认删除专注任务"${task.name}"？`,
                    confirmText: '删除',
                  });
                  if (confirmed) {
                    deleteFavoriteTask(task.id);
                  }
                }}
              >
                <Trash2 size={14} />
                <span>删除</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <FavoriteTaskModal
          initialTask={editingTask}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
};
