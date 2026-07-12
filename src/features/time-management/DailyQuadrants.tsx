import React from 'react';
import { Plus, GripVertical, CheckCircle2, Circle, Clock, AlignLeft, X } from 'lucide-react';
import { Task, QuadrantType } from './timeManagementTypes';

interface DailyQuadrantsProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onMoveTask: (taskId: string, newQuadrant: QuadrantType) => void;
  onAddTask: (title: string, quadrant: QuadrantType) => void;
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
  const [draftTasks, setDraftTasks] = React.useState<Record<QuadrantType, string>>({ Q1: '', Q2: '', Q3: '', Q4: '' });
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    // Required for Firefox
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, quadrant: QuadrantType) => {
    if (e.key === 'Enter') {
      const title = draftTasks[quadrant].trim();
      if (title) {
        onAddTask(title, quadrant);
        setDraftTasks(prev => ({ ...prev, [quadrant]: '' }));
      }
    }
  };

  const renderQuadrant = (type: QuadrantType) => {
    const config = quadrantConfig[type];
    let qTasks = tasks.filter(t => t.quadrant === type);
    
    if (hideCompleted) {
      qTasks = qTasks.filter(t => !t.completed);
    }
    
    // Sort tasks: uncompleted first, then by creation time
    const sortedTasks = [...qTasks].sort((a, b) => {
      if (a.completed === b.completed) return b.createdAt - a.createdAt;
      return a.completed ? 1 : -1;
    });

    return (
      <div 
        key={type}
        className={`quadrant-box quadrant-${type.toLowerCase()}`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDrop={(e) => handleDrop(e, type)}
      >
        <div className="quadrant-header">
          <div className="quadrant-title">
            <h3 style={{ color: config.color }}>{config.title}</h3>
            <span>{config.desc}</span>
          </div>
          <div className="quadrant-count">{qTasks.filter(t => !t.completed).length}</div>
        </div>
        
        <div className="quadrant-task-list">
          {sortedTasks.map(task => (
            <div 
              key={task.id} 
              className={`tm-task-item ${task.completed ? 'completed' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onClick={() => onEditTask(task)}
            >
              <div className="tm-task-drag-handle">
                <GripVertical size={14} />
              </div>
              <button 
                className="tm-task-checkbox" 
                onClick={(e) => { e.stopPropagation(); onToggleComplete(task.id); }}
                type="button"
              >
                {task.completed ? <CheckCircle2 size={16} color={config.color} /> : <Circle size={16} />}
              </button>
              <div className="tm-task-content-wrapper">
                <span className="tm-task-title">{task.title}</span>
                {(task.deadline || task.description) && (
                  <div className="tm-task-meta">
                    {task.deadline && (
                      <span className={`tm-meta-item ${task.deadline < Date.now() ? 'overdue' : ''}`}>
                        <Clock size={10} />
                        {new Date(task.deadline).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                    {task.description && (
                      <span className="tm-meta-item">
                        <AlignLeft size={10} />
                      </span>
                    )}
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
          ))}
        </div>
        
        <div className="quadrant-add-task">
          <Plus size={16} className="add-icon" />
          <input 
            type="text"
            placeholder="添加任务..."
            value={draftTasks[type]}
            onChange={(e) => setDraftTasks(prev => ({ ...prev, [type]: e.target.value }))}
            onKeyDown={(e) => handleKeyDown(e, type)}
          />
        </div>
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
