import React from 'react';
import { LayoutGrid, CalendarDays, Plus, GripVertical, User, Trash2, X } from 'lucide-react';
import { timeManagementStore, TimeManagementData } from './timeManagementStore';
import { timeManagementApi, TimeManagementSyncStatus } from './timeManagementService';
import { QuadrantType, Task } from './timeManagementTypes';
import { DailyQuadrants } from './DailyQuadrants';
import { WeeklyPlanning } from './WeeklyPlanning';
import { TaskDetailModal } from './TaskDetailModal';
import './timeManagement.css';

type TabType = 'daily' | 'weekly';

const PREDEFINED_COLORS = ['#1f6fd1', '#25845a', '#d97706', '#7657d6', '#d32f2f', '#0ea5e9'];

export function TimeManagementPanel() {
  const [activeTab, setActiveTab] = React.useState<TabType>('weekly');
  const [data, setData] = React.useState<TimeManagementData>({ roles: [], tasks: [] });
  const [hideCompleted, setHideCompleted] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);

  const [draftRoleName, setDraftRoleName] = React.useState('');
  const [draftTasks, setDraftTasks] = React.useState<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = React.useState<TimeManagementSyncStatus>({ state: 'saved', pendingCount: 0 });
  const syncTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSync = React.useCallback((newData: TimeManagementData) => {
    setData(newData);
    setSyncStatus((current) => ({ ...current, state: 'saving' }));
    
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      timeManagementApi.save(newData)
        .then(() => setSyncStatus({ state: 'saved', pendingCount: 0 }))
        .catch(() => setSyncStatus({ state: 'attention', pendingCount: 1 }));
    }, 1000);
  }, []);

  React.useEffect(() => {
    let isCancelled = false;
    timeManagementApi.load()
      .then((dbData) => {
        if (isCancelled) return;
        if (dbData) {
          setData(dbData);
          timeManagementStore.save(dbData);
        } else {
          setData(timeManagementStore.load());
        }
      })
      .catch(() => {
        if (isCancelled) return;
        setSyncStatus({ state: 'attention', pendingCount: 1 });
        setData(timeManagementStore.load());
      });
      
    return () => { isCancelled = true; };
  }, []);

  React.useEffect(() => {
    if (data.tasks.length === 0) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    let needsUpdate = false;
    
    const updatedTasks = data.tasks.map(task => {
      if (task.scheduledDate === todayStr && !task.completed && task.quadrant !== 'Q2' && task.quadrant !== 'Q1') {
        needsUpdate = true;
        return { ...task, quadrant: 'Q2' as QuadrantType };
      }
      return task;
    });

    if (needsUpdate) {
      const newData = { ...data, tasks: updatedTasks };
      timeManagementStore.save(newData);
      triggerSync(newData);
    }
  }, [data.tasks]);

  const handleToggleComplete = (taskId: string) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const isCompleted = !task.completed;
    timeManagementStore.updateTask(taskId, { 
      completed: isCompleted,
      completedAt: isCompleted ? Date.now() : undefined
    });
    triggerSync(timeManagementStore.load());
  };

  const handleMoveTask = (taskId: string, newQuadrant: QuadrantType) => {
    timeManagementStore.updateTask(taskId, { quadrant: newQuadrant });
    triggerSync(timeManagementStore.load());
  };

  const handleAddTaskToQuadrant = (title: string, quadrant: QuadrantType, deadline?: number) => {
    const task = timeManagementStore.addTask(title, quadrant, undefined);
    if (deadline) {
      timeManagementStore.updateTask(task.id, { deadline });
    }
    triggerSync(timeManagementStore.load());
  };

  const handleAddRole = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && draftRoleName.trim()) {
      const randomColor = PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)];
      timeManagementStore.addRole(draftRoleName.trim(), randomColor);
      triggerSync(timeManagementStore.load());
      setDraftRoleName('');
    }
  };

  const handleDeleteRole = (roleId: string) => {
    timeManagementStore.deleteRole(roleId);
    triggerSync(timeManagementStore.load());
  };

  const handleAddTaskToRole = (e: React.KeyboardEvent<HTMLInputElement>, roleId: string) => {
    if (e.key === 'Enter') {
      const title = draftTasks[roleId]?.trim();
      if (title) {
        timeManagementStore.addTask(title, 'Q2', undefined, roleId);
        triggerSync(timeManagementStore.load());
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
    timeManagementStore.updateTask(taskId, updates);
    triggerSync(timeManagementStore.load());
  };

  const handleDeleteTask = (taskId: string) => {
    timeManagementStore.deleteTask(taskId);
    triggerSync(timeManagementStore.load());
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    timeManagementStore.updateTask(taskId, updates);
    triggerSync(timeManagementStore.load());
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/tm-task-id', taskId);
  };

  const backlogTasks = data.tasks.filter(t => !t.scheduledDate && !t.completed);

  return (
    <section className="time-management-page">
      <div className="tm-shell" style={{ flexDirection: 'column', display: 'flex', height: '100%', width: '100%' }}>
        {/* Time Management Menu Bar */}
        <header className="tm-top-menubar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid var(--line-soft)', background: '#fff', flex: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>时间管理</h3>
            <div className="tm-tabs" style={{ display: 'flex', gap: '4px', background: 'var(--surface-2)', padding: '2px', borderRadius: '6px' }}>
              <button
                type="button"
                className={activeTab === 'weekly' ? 'active' : ''}
                onClick={() => setActiveTab('weekly')}
              >
                <CalendarDays size={14} />
                <span>周计划</span>
              </button>
              <button
                type="button"
                className={activeTab === 'daily' ? 'active' : ''}
                onClick={() => setActiveTab('daily')}
              >
                <LayoutGrid size={14} />
                <span>四象限工作台</span>
              </button>
            </div>
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
                  <button onClick={() => triggerSync(data)} style={{ cursor: 'pointer', color: 'var(--text-danger)', textDecoration: 'underline', background: 'none', border: 'none', padding: 0 }}>重试</button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Time Management Content Area */}
        <div className="tm-content-area" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {activeTab === 'weekly' && (
          <aside className="tm-roles-sidebar" style={{ width: '280px', flex: 'none', display: 'flex', flexDirection: 'column' }}>
            <div className="tm-sidebar-header" style={{ paddingTop: '16px' }}>
              <h3>待办分类 / 角色</h3>
              <span className="text-muted">为每个角色设定 Q2 要事</span>
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
