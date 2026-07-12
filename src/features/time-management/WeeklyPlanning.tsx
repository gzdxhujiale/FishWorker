import React from 'react';
import { Plus, GripVertical, Calendar, User, Trash2, Clock, X } from 'lucide-react';
import { Role, Task } from './timeManagementTypes';

interface WeeklyPlanningProps {
  roles: Role[];
  tasks: Task[];
  onAddRole: (name: string, color: string) => void;
  onDeleteRole: (roleId: string) => void;
  onAddTask: (title: string, roleId: string) => void;
  onScheduleTask: (taskId: string, date: string | undefined) => void;
  hideCompleted: boolean;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

const DAYS_OF_WEEK = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

function getWeekDates() {
  const today = new Date();
  const day = today.getDay(); // 0 is Sunday, 1 is Monday...
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  
  const monday = new Date(today.setDate(diff));
  const dates = [];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    // format as YYYY-MM-DD
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dates.push({ label: DAYS_OF_WEEK[i], dateStr });
  }
  
  return dates;
}

const PREDEFINED_COLORS = ['#1f6fd1', '#25845a', '#d97706', '#7657d6', '#d32f2f', '#0ea5e9'];

export function WeeklyPlanning({ roles, tasks, onAddRole, onDeleteRole, onAddTask, onScheduleTask, hideCompleted, onDeleteTask, onEditTask }: WeeklyPlanningProps) {
  const [draftRoleName, setDraftRoleName] = React.useState('');
  const [draftTasks, setDraftTasks] = React.useState<Record<string, string>>({});
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  
  const weekDates = React.useMemo(() => getWeekDates(), []);
  
  // Backlog tasks are those that have a role but aren't scheduled or completed
  const backlogTasks = tasks.filter(t => !t.scheduledDate && !t.completed);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/tm-task-id', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDateStr: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('application/tm-task-id') || draggedTaskId;
    if (taskId) {
      onScheduleTask(taskId, targetDateStr);
    }
    setDraggedTaskId(null);
  };

  const handleAddRole = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && draftRoleName.trim()) {
      const randomColor = PREDEFINED_COLORS[Math.floor(Math.random() * PREDEFINED_COLORS.length)];
      onAddRole(draftRoleName.trim(), randomColor);
      setDraftRoleName('');
    }
  };

  const handleAddTask = (e: React.KeyboardEvent<HTMLInputElement>, roleId: string) => {
    if (e.key === 'Enter') {
      const title = draftTasks[roleId]?.trim();
      if (title) {
        onAddTask(title, roleId);
        setDraftTasks(prev => ({ ...prev, [roleId]: '' }));
      }
    }
  };

  return (
    <div className="weekly-planning-layout">
      {/* Sidebar: Roles & Backlog */}
      <div className="tm-roles-sidebar">
        <div className="tm-sidebar-header">
          <h3>角色与目标池</h3>
          <span className="text-muted">为每个角色设定 Q2 要事</span>
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
                  <button className="icon-button tm-role-delete" onClick={() => onDeleteRole(role.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="tm-role-tasks" onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDrop={(e) => handleDrop(e, undefined)}>
                  {roleTasks.map(task => (
                    <div 
                      key={task.id} 
                      className="tm-backlog-task"
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => onEditTask(task)}
                    >
                      <GripVertical size={14} className="drag-handle" />
                      <span className="task-text-truncate">{task.title}</span>
                      <button 
                        className="icon-button tm-task-delete-btn" 
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  
                  <div className="tm-add-goal">
                    <Plus size={14} className="text-muted" />
                    <input 
                      type="text"
                      placeholder="添加本周目标..."
                      value={draftTasks[role.id] || ''}
                      onChange={(e) => setDraftTasks(prev => ({ ...prev, [role.id]: e.target.value }))}
                      onKeyDown={(e) => handleAddTask(e, role.id)}
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
      </div>
      
      {/* Main Area: Weekly Schedule Board */}
      <div className="tm-weekly-board">
        <div className="tm-board-header">
          <h3>本周日程看板</h3>
          <span className="text-muted">将左侧目标拖拽到具体日期中安排执行</span>
        </div>
        
        <div className="tm-kanban-grid">
          {weekDates.map((dayInfo, index) => {
            let dayTasks = tasks.filter(t => t.scheduledDate === dayInfo.dateStr);
            if (hideCompleted) {
              dayTasks = dayTasks.filter(t => !t.completed);
            }
            const isToday = new Date().toISOString().split('T')[0] === dayInfo.dateStr;
            
            return (
              <div 
                key={dayInfo.dateStr} 
                className={`tm-kanban-column ${isToday ? 'is-today' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={handleDragEnter}
                onDrop={(e) => handleDrop(e, dayInfo.dateStr)}
              >
                <div className="tm-column-header">
                  <strong>{dayInfo.label}</strong>
                  <span className="tm-date-label">{dayInfo.dateStr.slice(5)}</span>
                </div>
                
                <div className="tm-column-content">
                  {dayTasks.map(task => {
                    const taskRole = roles.find(r => r.id === task.roleId);
                    return (
                      <div 
                        key={task.id} 
                        className={`tm-scheduled-task ${task.completed ? 'completed' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => onEditTask(task)}
                        style={taskRole ? { borderLeftColor: taskRole.color } : {}}
                      >
                        <div className="tm-scheduled-task-content">
                          <span className="tm-task-title">{task.title}</span>
                          {task.deadline && (
                            <div className={`tm-task-deadline ${task.deadline < Date.now() ? 'overdue' : ''}`}>
                              <Clock size={12} />
                              {new Date(task.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          )}
                        </div>
                        <button 
                          className="icon-button tm-task-delete-btn" 
                          onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
