import React, { useState, useRef } from 'react';
import { Plus, CheckCircle2, Circle, AlignLeft, X, MoreHorizontal } from 'lucide-react';
import { Task, QuadrantType } from './timeManagementTypes';
import { CollapsibleGroup } from './components/CollapsibleGroup';
import { QuickAddPopover } from './components/QuickAddPopover';

interface DailyQuadrantsProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onMoveTask: (taskId: string, newQuadrant: QuadrantType) => void;
  onAddTask: (title: string, quadrant: QuadrantType, deadline?: number) => void;
  hideCompleted: boolean;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

const quadrantConfig: Record<QuadrantType, { title: string; desc: string; color: string; bgColor: string }> = {
  Q1: { title: '重要且紧急', desc: '危机、急迫的问题', color: '#d32f2f', bgColor: '#fef2f2' },
  Q2: { title: '重要不紧急', desc: '计划、预防、要事', color: '#25845a', bgColor: '#f0fdf4' },
  Q3: { title: '紧急不重要', desc: '干扰、某些会议', color: '#d97706', bgColor: '#fffbeb' },
  Q4: { title: '不重要不紧急', desc: '琐事、消遣', color: '#697381', bgColor: '#f8fafc' },
};

export function DailyQuadrants({ tasks, onToggleComplete, onMoveTask, onAddTask, hideCompleted, onDeleteTask, onEditTask }: DailyQuadrantsProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activePopover, setActivePopover] = useState<QuadrantType | null>(null);
  
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
    if (taskId) {
      onMoveTask(taskId, targetQuadrant);
    }
    setDraggedTaskId(null);
  };

  const renderTasks = (taskList: Task[], color: string) => {
    return taskList.map(task => (
      <div 
        key={task.id} 
        className={`tm-task-item-minimal ${task.completed ? 'completed' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        onClick={() => onEditTask(task)}
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
    ));
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

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();

    const noDate: Task[] = [];
    const within1Day: Task[] = [];
    const within3Days: Task[] = [];
    const within1Week: Task[] = [];
    const beyond1Week: Task[] = [];

    sortedTasks.forEach(t => {
      if (!t.deadline) {
        noDate.push(t);
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
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-strong)' }}>
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
        
        <div className="quadrant-task-list">
          <CollapsibleGroup title="一天内" count={within1Day.length}>
            {renderTasks(within1Day, config.color)}
          </CollapsibleGroup>
          <CollapsibleGroup title="三天内" count={within3Days.length}>
            {renderTasks(within3Days, config.color)}
          </CollapsibleGroup>
          <CollapsibleGroup title="一周内" count={within1Week.length}>
            {renderTasks(within1Week, config.color)}
          </CollapsibleGroup>
          <CollapsibleGroup title="一周外" count={beyond1Week.length}>
            {renderTasks(beyond1Week, config.color)}
          </CollapsibleGroup>
          <CollapsibleGroup title="无日期" count={noDate.length}>
            {renderTasks(noDate, config.color)}
          </CollapsibleGroup>
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
