import React from 'react';
import { Plus, GripVertical, User, Trash2, X } from 'lucide-react';
import { timeManagementStore, TimeManagementData } from './timeManagementStore';
import { TimeManagementSyncStatus } from './timeManagementService';
import { QuadrantType, Task } from './timeManagementTypes';
import { DailyQuadrants } from './DailyQuadrants';
import { WeeklyPlanning } from './WeeklyPlanning';
import { TaskDetailModal } from './TaskDetailModal';
import './timeManagement.css';


const PREDEFINED_COLORS = ['#1f6fd1', '#25845a', '#d97706', '#7657d6', '#d32f2f', '#0ea5e9'];

interface TimeManagementPanelProps {
  mode?: 'weekly' | 'daily';
}

export function TimeManagementPanel({ mode = 'weekly' }: TimeManagementPanelProps) {
  const activeTab = mode;
  const [data, setData] = React.useState<TimeManagementData>({ roles: [], tasks: [] });
  const [hideCompleted, setHideCompleted] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);

  const [draftRoleName, setDraftRoleName] = React.useState('');
  const [draftTasks, setDraftTasks] = React.useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = React.useState<TimeManagementSyncStatus>({ state: 'saved', pendingCount: 0 });

  React.useEffect(() => {
    let isCancelled = false;
    
    // Initial Load & Sync
    timeManagementStore.syncAllFromDB().then(() => {
      if (!isCancelled) {
        setData(timeManagementStore.load());
      }
    });

    const handleUpdate = () => {
      if (!isCancelled) setData(timeManagementStore.load());
    };
    
    const handleSyncUpdate = () => {
      if (!isCancelled) setSyncStatus(timeManagementStore.getSyncStatus());
    };

    window.addEventListener('time-management-updated', handleUpdate);
    window.addEventListener('time-management-sync-updated', handleSyncUpdate);

    return () => {
      isCancelled = true;
      window.removeEventListener('time-management-updated', handleUpdate);
      window.removeEventListener('time-management-sync-updated', handleSyncUpdate);
    };
  }, []);

  React.useEffect(() => {
    if (data.tasks.length === 0) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    let hasUpdates = false;
    
    const updatedTasks = data.tasks.map(task => {
      if (task.scheduledDate === todayStr && !task.completed && task.quadrant !== 'Q2' && task.quadrant !== 'Q1') {
        hasUpdates = true;
        return { ...task, quadrant: 'Q2' as QuadrantType };
      }
      return task;
    });

    if (hasUpdates) {
      // Find which tasks were updated and trigger individual syncs
      data.tasks.forEach((oldTask, i) => {
        const newTask = updatedTasks[i];
        if (oldTask.quadrant !== newTask.quadrant) {
          timeManagementStore.updateTask(oldTask.id, { quadrant: newTask.quadrant }, false);
        }
      });
    }
  }, [data.tasks]);

  const handleToggleComplete = (taskId: string) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const isCompleted = !task.completed;
    timeManagementStore.updateTask(taskId, { 
      completed: isCompleted,
      completedAt: isCompleted ? Date.now() : undefined
    }, false); // false = not high freq
  };

  const handleMoveTask = (taskId: string, newQuadrant: QuadrantType) => {
    timeManagementStore.updateTask(taskId, { quadrant: newQuadrant }, false);
  };

  const handleAddTaskToQuadrant = (title: string, quadrant: QuadrantType, deadline?: number) => {
    const task = timeManagementStore.addTask(title, quadrant, undefined);
    if (deadline) {
      timeManagementStore.updateTask(task.id, { deadline }, false);
    }
  };

  const handleAddRole = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && draftRoleName.trim()) {
      const randomColor = PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)];
      timeManagementStore.addRole(draftRoleName.trim(), randomColor);
      setDraftRoleName('');
    }
  };

  const handleDeleteRole = (roleId: string) => {
    timeManagementStore.deleteRole(roleId);
  };

  const handleAddTaskToRole = (e: React.KeyboardEvent<HTMLInputElement>, roleId: string) => {
    if (e.key === 'Enter') {
      const title = draftTasks[roleId]?.trim();
      if (title) {
        timeManagementStore.addTask(title, 'Q2', undefined, roleId);
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
    timeManagementStore.updateTask(taskId, updates, false);
  };

  const handleDeleteTask = (taskId: string) => {
    timeManagementStore.deleteTask(taskId);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    // updates from generic text edits will be true by default
    timeManagementStore.updateTask(taskId, updates);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/tm-task-id', taskId);
  };

  const backlogTasks = data.tasks.filter(t => !t.scheduledDate && !t.completed);

  return (
    <section className="time-management-page">
      <div className="tm-shell" style={{ flexDirection: 'column', display: 'flex', height: '100%', width: '100%' }}>
        {/* Time Management Menu Bar (rendered only in daily mode) */}
        {mode === 'daily' && (
          <header className="tm-top-menubar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid var(--line-soft)', background: '#fff', flex: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                四象限工作台
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label className="tm-toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}>
                <input 
                  type="checkbox" 
                  checked={hideCompleted} 
                  onChange={(e) => setHideCompleted(e.target.checked)} 
                />
                隐藏已完成任务
              </label>
              <div style={{ marginLeft: '16px', fontSize: '13px', color: syncStatus.state === 'attention' ? 'var(--text-danger)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {syncStatus.state === 'saving' && '正在保存...'}
                {syncStatus.state === 'saved' && '已保存'}
                {syncStatus.state === 'attention' && (
                  <>
                    部分内容暂时没同步
                  </>
                )}
              </div>
            </div>
          </header>
        )}

        {/* Time Management Content Area */}
        <div className="tm-content-area" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {activeTab === 'weekly' && (
          <aside className="tm-roles-sidebar" style={{ width: '240px', flex: 'none', display: 'flex', flexDirection: 'column' }}>
            <div className="tm-sidebar-header">
              <h3>本周计划看板</h3>
            </div>
          
          <div className="tm-roles-list">
            {data.roles.map(role => {
              const roleTasks = backlogTasks.filter(t => t.roleId === role.id);
              return (
                <div key={role.id} className="tm-role-card" style={{ borderLeftColor: role.color }}>
                  <div className="tm-role-header">
                    <div className="tm-role-title">
                      <User size={16} color={role.color} />
                      <strong style={{ color: role.color }}>{role.name}</strong>
                    </div>
                    <button className="icon-button tm-role-delete" onClick={() => handleDeleteRole(role.id)}>
                      <Trash2 size={14} />
                    </button>
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
          
          <div className="tm-add-role-input">
            <input 
              type="text"
              placeholder="+ 添加新角色 (按 Enter 保存)"
              value={draftRoleName}
              onChange={(e) => setDraftRoleName(e.target.value)}
              onKeyDown={handleAddRole}
            />
          </div>
          </aside>
          )}

        <main className="tm-main-dashboard" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="tm-workspace" style={{ overflowX: activeTab === 'weekly' ? 'auto' : 'hidden', overflowY: 'auto' }}>
            {activeTab === 'weekly' ? (
              <WeeklyPlanning 
                roles={data.roles} 
                tasks={data.tasks} 
                onScheduleTask={handleScheduleTask}
                hideCompleted={hideCompleted}
                onDeleteTask={handleDeleteTask}
                onEditTask={(task) => setEditingTask(task)}
              />
            ) : (
              <DailyQuadrants 
                tasks={data.tasks} 
                onToggleComplete={handleToggleComplete}
                onMoveTask={handleMoveTask}
                onAddTask={handleAddTaskToQuadrant}
                hideCompleted={hideCompleted}
                onDeleteTask={handleDeleteTask}
                onEditTask={(task) => setEditingTask(task)}
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
