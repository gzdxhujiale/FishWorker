import React from 'react';
import { Calendar, LayoutGrid, CalendarDays } from 'lucide-react';
import { timeManagementStore, TimeManagementData } from './timeManagementStore';
import { QuadrantType } from './timeManagementTypes';
import { DailyQuadrants } from './DailyQuadrants';
import { WeeklyPlanning } from './WeeklyPlanning';
import { TaskDetailModal } from './TaskDetailModal';
import { Task } from './timeManagementTypes';
import './timeManagement.css';

type TabType = 'daily' | 'weekly';

export function TimeManagementPanel() {
  const [activeTab, setActiveTab] = React.useState<TabType>('weekly');
  const [data, setData] = React.useState<TimeManagementData>({ roles: [], tasks: [] });
  const [hideCompleted, setHideCompleted] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);

  React.useEffect(() => {
    setData(timeManagementStore.load());
  }, []);

  // Sync today's scheduled tasks to Q2 if they are not completed
  React.useEffect(() => {
    if (data.tasks.length === 0) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    let needsUpdate = false;
    
    const updatedTasks = data.tasks.map(task => {
      // If a task is scheduled for today, not completed, and somehow in Q4 or Q3, bump it to Q2.
      // (According to PRD, scheduled tasks automatically show up in Q2 on the day)
      if (task.scheduledDate === todayStr && !task.completed && task.quadrant !== 'Q2' && task.quadrant !== 'Q1') {
        needsUpdate = true;
        return { ...task, quadrant: 'Q2' as QuadrantType };
      }
      return task;
    });

    if (needsUpdate) {
      setData(prev => ({ ...prev, tasks: updatedTasks }));
      timeManagementStore.save({ ...data, tasks: updatedTasks });
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
    setData(timeManagementStore.load());
  };

  const handleMoveTask = (taskId: string, newQuadrant: QuadrantType) => {
    timeManagementStore.updateTask(taskId, { quadrant: newQuadrant });
    setData(timeManagementStore.load());
  };

  const handleAddTaskToQuadrant = (title: string, quadrant: QuadrantType) => {
    const todayStr = new Date().toISOString().split('T')[0];
    timeManagementStore.addTask(title, quadrant, todayStr);
    setData(timeManagementStore.load());
  };

  const handleAddRole = (name: string, color: string) => {
    timeManagementStore.addRole(name, color);
    setData(timeManagementStore.load());
  };

  const handleDeleteRole = (roleId: string) => {
    timeManagementStore.deleteRole(roleId);
    setData(timeManagementStore.load());
  };

  const handleAddTaskToRole = (title: string, roleId: string) => {
    timeManagementStore.addTask(title, 'Q2', undefined, roleId);
    setData(timeManagementStore.load());
  };

  const handleScheduleTask = (taskId: string, date: string | undefined) => {
    timeManagementStore.updateTask(taskId, { scheduledDate: date });
    setData(timeManagementStore.load());
  };

  const handleDeleteTask = (taskId: string) => {
    timeManagementStore.deleteTask(taskId);
    setData(timeManagementStore.load());
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    timeManagementStore.updateTask(taskId, updates);
    setData(timeManagementStore.load());
  };

  return (
    <section className="time-management-page">
      <div className="tm-shell">
        <header className="tm-header">
          <div>
            <h1>高效能时间管理</h1>
            <span>基于要事第一原则</span>
          </div>
          <div className="tm-tabs" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label className="tm-toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}>
              <input 
                type="checkbox" 
                checked={hideCompleted} 
                onChange={(e) => setHideCompleted(e.target.checked)} 
              />
              隐藏已完成任务
            </label>
            <div style={{ display: 'flex' }}>
              <button
                type="button"
                className={activeTab === 'weekly' ? 'active' : ''}
                onClick={() => setActiveTab('weekly')}
              >
                <CalendarDays size={14} />
                <span>周计划与角色</span>
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
        </header>

        <div className="tm-workspace">
          {activeTab === 'weekly' ? (
            <WeeklyPlanning 
              roles={data.roles} 
              tasks={data.tasks} 
              onAddRole={handleAddRole}
              onDeleteRole={handleDeleteRole}
              onAddTask={handleAddTaskToRole}
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
        
        {editingTask && (
          <TaskDetailModal 
            task={editingTask} 
            onClose={() => setEditingTask(null)} 
            onSave={handleUpdateTask} 
          />
        )}
      </div>
    </section>
  );
}
