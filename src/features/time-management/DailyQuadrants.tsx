import React, { useState, useRef } from 'react';
import { Plus, CheckCircle2, Circle, AlignLeft, X } from 'lucide-react';
import { Task, QuadrantType } from './timeManagementTypes';
import { CollapsibleGroup } from './components/CollapsibleGroup';
import { QuickAddPopover } from './components/QuickAddPopover';

interface DailyQuadrantsProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onAddTask: (title: string, quadrant: QuadrantType, deadline?: number) => void;
  hideCompleted: boolean;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
}

const quadrantConfig: Record<QuadrantType, { title: string; desc: string; color: string; bgColor: string }> = {
  Q1: { title: '重要且紧急', desc: '危机、急迫的问题', color: '#d32f2f', bgColor: '#fef2f2' },
  Q2: { title: '重要不紧急', desc: '计划、预防、要事', color: '#25845a', bgColor: '#f0fdf4' },
  Q3: { title: '紧急不重要', desc: '干扰、某些会议', color: '#d97706', bgColor: '#fffbeb' },
  Q4: { title: '不重要不紧急', desc: '琐事、消遣', color: '#697381', bgColor: '#f8fafc' },
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getDeadlineGroup(deadline: number | undefined, now: number): string {
  if (!deadline) return '无日期';
  if (deadline < now) return '已过期';
  const diffDays = (deadline - now) / MS_PER_DAY;
  if (diffDays <= 1) return '一天内';
  if (diffDays <= 3) return '三天内';
  if (diffDays <= 7) return '一周内';
  return '一周外';
}

function getDefaultDeadlineForGroup(groupName: string, now: number): number | undefined {
  if (groupName === '已过期') {
    return now - 3600 * 1000;
  }
  if (groupName === '一天内') {
    const d = new Date(now + MS_PER_DAY);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }
  if (groupName === '三天内') {
    const d = new Date(now + 3 * MS_PER_DAY);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }
  if (groupName === '一周内') {
    const d = new Date(now + 7 * MS_PER_DAY);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }
  if (groupName === '一周外') {
    const d = new Date(now + 8 * MS_PER_DAY);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }
  return undefined;
}

export function DailyQuadrants({ tasks, onToggleComplete, onAddTask, hideCompleted, onDeleteTask, onEditTask, onUpdateTask }: DailyQuadrantsProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activePopover, setActivePopover] = useState<QuadrantType | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'top' | 'bottom' | null>(null);
  
  const q1Ref = useRef<HTMLButtonElement>(null);
  const q2Ref = useRef<HTMLButtonElement>(null);
  const q3Ref = useRef<HTMLButtonElement>(null);
  const q4Ref = useRef<HTMLButtonElement>(null);

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

  const handleDrop = (e: React.DragEvent, targetQuadrant: QuadrantType) => {
    e.preventDefault();
    e.stopPropagation();
    const taskId = e.dataTransfer.getData('application/tm-task-id') || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDropPosition(null);
    
    if (taskId) {
      onUpdateTask(taskId, { quadrant: targetQuadrant });
    }
  };

  const handleDragOverTask = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (taskId === draggedTaskId) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const position = relativeY > rect.height / 2 ? 'bottom' : 'top';
    
    setDragOverTaskId(taskId);
    setDropPosition(position);
  };

  const handleDragLeaveTask = () => {
    setDragOverTaskId(null);
    setDropPosition(null);
  };

  const handleDropOnTask = (e: React.DragEvent, targetTask: Task) => {
    e.preventDefault();
    e.stopPropagation();
    
    const taskId = e.dataTransfer.getData('application/tm-task-id') || draggedTaskId;
    setDragOverTaskId(null);
    setDropPosition(null);
    setDraggedTaskId(null);
    
    if (!taskId || taskId === targetTask.id) return;

    const targetQTasks = tasks.filter(t => t.quadrant === targetTask.quadrant);
    const filteredTasks = hideCompleted ? targetQTasks.filter(t => !t.completed) : targetQTasks;
    
    const now = Date.now();
    const targetGroup = getDeadlineGroup(targetTask.deadline, now);
    
    const sameGroupTasks = [...filteredTasks].filter(t => 
      t.completed === targetTask.completed && 
      getDeadlineGroup(t.deadline, now) === targetGroup &&
      t.id !== taskId
    ).sort((a, b) => b.createdAt - a.createdAt);

    const yIndex = sameGroupTasks.findIndex(t => t.id === targetTask.id);
    if (yIndex === -1) return;

    let newCreatedAt = targetTask.createdAt;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const isBelow = relativeY > rect.height / 2;

    if (!isBelow) {
      if (yIndex === 0) {
        newCreatedAt = targetTask.createdAt + 1000;
      } else {
        const prevTask = sameGroupTasks[yIndex - 1];
        newCreatedAt = Math.round((prevTask.createdAt + targetTask.createdAt) / 2);
      }
    } else {
      if (yIndex === sameGroupTasks.length - 1) {
        newCreatedAt = targetTask.createdAt - 1000;
      } else {
        const nextTask = sameGroupTasks[yIndex + 1];
        newCreatedAt = Math.round((targetTask.createdAt + nextTask.createdAt) / 2);
      }
    }

    onUpdateTask(taskId, {
      quadrant: targetTask.quadrant,
      deadline: targetTask.deadline,
      createdAt: newCreatedAt
    });
  };

  const handleDropOnGroup = (e: React.DragEvent, targetQuadrant: QuadrantType, groupName: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const taskId = e.dataTransfer.getData('application/tm-task-id') || draggedTaskId;
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    setDropPosition(null);
    
    if (!taskId) return;
    
    const taskObj = tasks.find(t => t.id === taskId);
    if (!taskObj) return;

    const now = Date.now();
    const targetDeadline = getDefaultDeadlineForGroup(groupName, now);

    const targetQTasks = tasks.filter(t => t.quadrant === targetQuadrant);
    const filteredTasks = hideCompleted ? targetQTasks.filter(t => !t.completed) : targetQTasks;
    const sameGroupTasks = filteredTasks.filter(t => 
      t.completed === taskObj.completed && 
      getDeadlineGroup(t.deadline, now) === groupName &&
      t.id !== taskId
    );

    let newCreatedAt = Date.now();
    if (sameGroupTasks.length > 0) {
      newCreatedAt = Math.max(...sameGroupTasks.map(t => t.createdAt)) + 1000;
    }

    onUpdateTask(taskId, {
      quadrant: targetQuadrant,
      deadline: targetDeadline,
      createdAt: newCreatedAt
    });
  };

  const renderTasks = (taskList: Task[], color: string) => {
    const now = Date.now();
    return taskList.map(task => {
      const isHovered = dragOverTaskId === task.id;
      const isExpired = task.deadline && task.deadline < now && !task.completed;
      return (
        <div 
          key={task.id} 
          className={`tm-task-item-minimal ${task.completed ? 'completed' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, task.id)}
          onDragOver={(e) => handleDragOverTask(e, task.id)}
          onDragLeave={handleDragLeaveTask}
          onDrop={(e) => handleDropOnTask(e, task)}
          onClick={() => onEditTask(task)}
          style={{
            borderTop: isHovered && dropPosition === 'top' ? '2px solid var(--accent, #1f6fd1)' : undefined,
            borderBottom: isHovered && dropPosition === 'bottom' ? '2px solid var(--accent, #1f6fd1)' : undefined,
            paddingTop: isHovered && dropPosition === 'top' ? '4px' : undefined,
            paddingBottom: isHovered && dropPosition === 'bottom' ? '4px' : undefined,
          }}
        >
          <button 
            className="tm-task-checkbox" 
            onClick={(e) => { e.stopPropagation(); onToggleComplete(task.id); }}
            type="button"
          >
            {task.completed ? <CheckCircle2 size={16} color={color} /> : <Circle size={16} />}
          </button>
          <div className="tm-task-content-wrapper" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px', minWidth: 0 }}>
            <span className="tm-task-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
            {isExpired && (
              <span
                className="tm-overdue-tag"
                onClick={(e) => {
                  e.stopPropagation();
                  const today = new Date();
                  today.setHours(23, 59, 59, 999);
                  onUpdateTask(task.id, { deadline: today.getTime() });
                }}
                title="点击延期至今日"
                style={{
                  fontSize: '10px',
                  color: '#dc2626',
                  backgroundColor: '#fef2f2',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  border: '1px solid #fca5a5',
                  flexShrink: 0,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget;
                  target.textContent = '延期';
                  target.style.backgroundColor = '#dc2626';
                  target.style.color = '#ffffff';
                  target.style.borderColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget;
                  target.textContent = '已过期';
                  target.style.backgroundColor = '#fef2f2';
                  target.style.color = '#dc2626';
                  target.style.borderColor = '#fca5a5';
                }}
              >
                已过期
              </span>
            )}
            {task.description && (
              <span className="tm-task-meta" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: 'var(--text-muted)' }}>
                <AlignLeft size={12} />
              </span>
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
    });
  };

  const renderQuadrant = (type: QuadrantType) => {
    const config = quadrantConfig[type];
    let qTasks = tasks.filter(t => t.quadrant === type);
    
    if (hideCompleted) {
      qTasks = qTasks.filter(t => !t.completed);
    }
    
    const sortedTasks = [...qTasks].sort((a, b) => {
      if (a.completed === b.completed) return b.createdAt - a.createdAt;
      return a.completed ? 1 : -1;
    });

    const now = Date.now();

    const expired: Task[] = [];
    const noDate: Task[] = [];
    const within1Day: Task[] = [];
    const within3Days: Task[] = [];
    const within1Week: Task[] = [];
    const beyond1Week: Task[] = [];

    sortedTasks.forEach(t => {
      if (!t.deadline) {
        noDate.push(t);
      } else if (t.deadline < now) {
        expired.push(t);
      } else {
        const diffDays = (t.deadline - now) / MS_PER_DAY;
        if (diffDays <= 1) within1Day.push(t);
        else if (diffDays <= 3) within3Days.push(t);
        else if (diffDays <= 7) within1Week.push(t);
        else beyond1Week.push(t);
      }
    });

    const ref = type === 'Q1' ? q1Ref : type === 'Q2' ? q2Ref : type === 'Q3' ? q3Ref : q4Ref;

    return (
      <div 
        key={type}
        className={`quadrant-box quadrant-${type.toLowerCase()}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDrop={(e) => handleDrop(e, type)}
      >
        <div className="quadrant-header">
          <div className="quadrant-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: config.color, color: '#fff', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{type[1]}</div>
            <h3 style={{ color: config.color }}>{config.title}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              ref={ref}
              onClick={() => setActivePopover(activePopover === type ? null : type)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-strong)' }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        
        <div className="quadrant-task-list">
          {expired.length > 0 && (
            <div onDragOver={handleDragOver} onDrop={(e) => handleDropOnGroup(e, type, '已过期')}>
              <CollapsibleGroup title="已过期" count={expired.length} titleColor="#d32f2f">
                {renderTasks(expired, config.color)}
              </CollapsibleGroup>
            </div>
          )}
          {within1Day.length > 0 && (
            <div onDragOver={handleDragOver} onDrop={(e) => handleDropOnGroup(e, type, '一天内')}>
              <CollapsibleGroup title="一天内" count={within1Day.length}>
                {renderTasks(within1Day, config.color)}
              </CollapsibleGroup>
            </div>
          )}
          {within3Days.length > 0 && (
            <div onDragOver={handleDragOver} onDrop={(e) => handleDropOnGroup(e, type, '三天内')}>
              <CollapsibleGroup title="三天内" count={within3Days.length}>
                {renderTasks(within3Days, config.color)}
              </CollapsibleGroup>
            </div>
          )}
          {within1Week.length > 0 && (
            <div onDragOver={handleDragOver} onDrop={(e) => handleDropOnGroup(e, type, '一周内')}>
              <CollapsibleGroup title="一周内" count={within1Week.length}>
                {renderTasks(within1Week, config.color)}
              </CollapsibleGroup>
            </div>
          )}
          {beyond1Week.length > 0 && (
            <div onDragOver={handleDragOver} onDrop={(e) => handleDropOnGroup(e, type, '一周外')}>
              <CollapsibleGroup title="一周外" count={beyond1Week.length}>
                {renderTasks(beyond1Week, config.color)}
              </CollapsibleGroup>
            </div>
          )}
          {noDate.length > 0 && (
            <div onDragOver={handleDragOver} onDrop={(e) => handleDropOnGroup(e, type, '无日期')}>
              <CollapsibleGroup title="无日期" count={noDate.length}>
                {renderTasks(noDate, config.color)}
              </CollapsibleGroup>
            </div>
          )}
        </div>

        {activePopover === type && (
          <QuickAddPopover
            quadrant={type}
            onAdd={(title, q, deadline) => {
              onAddTask(title, q, deadline);
            }}
            onClose={() => setActivePopover(null)}
            triggerRef={ref}
          />
        )}
      </div>
    );
  };

  return (
    <div className="daily-quadrants-layout">
      {renderQuadrant('Q1')}
      {renderQuadrant('Q2')}
      {renderQuadrant('Q3')}
      {renderQuadrant('Q4')}
    </div>
  );
}
