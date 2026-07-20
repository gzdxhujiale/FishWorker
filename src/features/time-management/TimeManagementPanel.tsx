import React from 'react';
import { Plus, GripVertical, User, Trash2, X, MoreHorizontal } from 'lucide-react';
import { useTimeStore } from './timeManagementStore';
import { QuadrantType, Task } from './timeManagementTypes';
import { DailyQuadrants } from './DailyQuadrants';
import { WeeklyPlanning } from './WeeklyPlanning';
import { TaskDetailModal } from './TaskDetailModal';
import { usePreferencesStore } from '../settings/preferencesStore';
import './timeManagement.css';

const PREDEFINED_COLORS = ['#1f6fd1', '#25845a', '#d97706', '#7657d6', '#d32f2f', '#0ea5e9'];

interface TimeManagementPanelProps {
  mode?: 'weekly' | 'daily';
}

export function TimeManagementPanel({ mode = 'weekly' }: TimeManagementPanelProps) {
  const activeTab = mode;

  const roles = useTimeStore(state => state.data.roles);
  const tasks = useTimeStore(state => state.data.tasks);

  const {
    syncAllFromDB,
    updateTask,
    addTask,
    deleteTask
  } = useTimeStore();

  const hideCompletedStr = usePreferencesStore(state => state.getPreference('tm-hide-completed', 'false'));
  const hideCompleted = hideCompletedStr === 'true';
  const setPreference = usePreferencesStore(state => state.setPreference);
  const setHideCompleted = (val: boolean) => setPreference('tm-hide-completed', String(val));

  const [editingTask, setEditingTask] = React.useState<Task | null>(null);

  const [draftTasks, setDraftTasks] = React.useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    syncAllFromDB();
  }, [syncAllFromDB]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (tasks.length === 0) return;

    const todayStr = new Date().toISOString().split('T')[0];
    let hasUpdates = false;

    const updatedTasks = tasks.map(task => {
      if (task.scheduledDate === todayStr && !task.completed && task.quadrant !== 'Q2' && task.quadrant !== 'Q1') {
        hasUpdates = true;
        return { ...task, quadrant: 'Q2' as QuadrantType };
      }
      return task;
    });

    if (hasUpdates) {
      // Find which tasks were updated and trigger individual syncs
      tasks.forEach((oldTask, i) => {
        const newTask = updatedTasks[i];
        if (oldTask.quadrant !== newTask.quadrant) {
          updateTask(oldTask.id, { quadrant: newTask.quadrant }, false);
        }
      });
    }
  }, [tasks, updateTask]);

  const handleToggleComplete = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const isCompleted = !task.completed;
    updateTask(taskId, {
      completed: isCompleted,
      completedAt: isCompleted ? Date.now() : undefined
    }, false); // false = not high freq
  };



  const handleAddTaskToQuadrant = (title: string, quadrant: QuadrantType, deadline?: number) => {
    const task = addTask(title, quadrant, undefined);
    if (deadline) {
      updateTask(task.id, { deadline }, false);
    }
  };


  const handleAddTaskToRole = (e: React.KeyboardEvent<HTMLInputElement>, roleId: string) => {
    if (e.key === 'Enter') {
      const title = draftTasks[roleId]?.trim();
      if (title) {
        addTask(title, 'Q2', undefined, roleId);
        setDraftTasks(prev => ({ ...prev, [roleId]: '' }));
      }
    }
  };

  const handleScheduleTask = (taskId: string, date: string | undefined, timeOfDay?: 'morning' | 'afternoon') => {
    const updates: Partial<Task> = { scheduledDate: date, timeOfDay };
    if (date) {
      // Set deadline to the end of the scheduled day
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      updates.deadline = d.getTime();
      updates.quadrant = 'Q2';
    }
    updateTask(taskId, updates, false);
  };

  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/tm-task-id', taskId);
  };

  const backlogTasks = tasks.filter(t => !t.scheduledDate && !t.completed);

  return (
    <section className="time-management-page">
      <div className="tm-shell" style={{ flexDirection: 'column', display: 'flex', height: '100%', width: '100%' }}>
        {/* Time Management Menu Bar (rendered only in daily mode) */}
        {mode === 'daily' && (
          <header className="tm-top-menubar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 24px', borderBottom: '1px solid var(--line-soft)', background: 'transparent', flex: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                四象限工作台
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }} ref={menuRef}>
              <button
                className="icon-button"
                onClick={() => setMenuOpen(!menuOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
              >
                <MoreHorizontal size={18} />
              </button>
              {menuOpen && (
                <div
                  className="tm-dropdown-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'var(--surface-2, var(--color-bg-elevated))',
                    border: '1px solid var(--line-strong, var(--color-border))',
                    borderRadius: '6px',
                    padding: '8px',
                    zIndex: 100,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    minWidth: '150px'
                  }}
                >
                  <label
                    className="tm-toggle-label"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--text-primary, var(--color-text))',
                      padding: '6px 8px',
                      borderRadius: '4px',
                      userSelect: 'none'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={hideCompleted}
                      onChange={(e) => setHideCompleted(e.target.checked)}
                    />
                    <span>隐藏已完成</span>
                  </label>
                </div>
              )}
            </div>
          </header>
        )}

        {/* Time Management Content Area */}
        <div className="tm-content-area" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {activeTab === 'weekly' && (
            <aside className="tm-roles-sidebar" style={{ width: '200px', flex: 'none', display: 'flex', flexDirection: 'column' }}>
              <div className="tm-sidebar-header" style={{ height: '50px', background: 'transparent' }}>
                <h3>本周计划看板</h3>
              </div>

              <div className="tm-roles-list">
                {roles.map(role => {
                  const roleTasks = backlogTasks.filter(t => t.roleId === role.id);
                  return (
                    <div key={role.id} className="tm-role-card" style={{ borderLeftColor: role.color }}>
                      <div className="tm-role-header">
                        <div className="tm-role-title">
                          <User size={16} color={role.color} />
                          <strong style={{ color: role.color }}>{role.name}</strong>
                        </div>
                      </div>

                      <div className="tm-role-tasks">
                        {roleTasks.map(task => (
                          <div
                            key={task.id}
                            className="tm-backlog-task"
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onClick={() => setEditingTask(task)}
                          >
                            <GripVertical size={14} className="drag-handle" />
                            <span className="task-text-truncate">{task.title}</span>
                            <button
                              className="icon-button tm-task-delete-btn"
                              onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}

                        <div className="tm-add-goal">
                          <Plus size={14} className="text-muted" />
                          <input
                            type="text"
                            placeholder="添加目标..."
                            value={draftTasks[role.id] || ''}
                            onChange={(e) => setDraftTasks(prev => ({ ...prev, [role.id]: e.target.value }))}
                            onKeyDown={(e) => handleAddTaskToRole(e, role.id)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          <main className="tm-main-dashboard" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div className="tm-workspace" style={{ overflowX: activeTab === 'weekly' ? 'auto' : 'hidden', overflowY: 'auto' }}>
              {activeTab === 'weekly' ? (
                <WeeklyPlanning
                  roles={roles}
                  tasks={tasks}
                  onScheduleTask={handleScheduleTask}
                  hideCompleted={hideCompleted}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={(task) => setEditingTask(task)}
                />
              ) : (
                <DailyQuadrants
                  tasks={tasks}
                  onToggleComplete={handleToggleComplete}
                  onAddTask={handleAddTaskToQuadrant}
                  hideCompleted={hideCompleted}
                  onDeleteTask={handleDeleteTask}
                  onEditTask={(task) => setEditingTask(task)}
                  onUpdateTask={handleUpdateTask}
                />
              )}
            </div>
          </main>

          {editingTask && (
            <TaskDetailModal
              task={editingTask}
              onClose={() => setEditingTask(null)}
              onSave={handleUpdateTask}
            />
          )}
        </div>
      </div>
    </section>
  );
}
