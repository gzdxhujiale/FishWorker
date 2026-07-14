import { useState, useEffect } from 'react';
import { X, Calendar, AlignLeft, Type } from 'lucide-react';
import { Task } from './timeManagementTypes';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
}

export function TaskDetailModal({ task, onClose, onSave }: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [deadlineStr, setDeadlineStr] = useState<string>('');

  useEffect(() => {
    if (task.deadline) {
      const d = new Date(task.deadline);
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const pad = (n: number) => String(n).padStart(2, '0');
      const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setDeadlineStr(formatted);
    } else {
      setDeadlineStr('');
    }
  }, [task.deadline]);

  const handleSave = () => {
    const updates: Partial<Task> = {
      title: title.trim(),
      description: description.trim() || undefined,
    };
    if (deadlineStr) {
      updates.deadline = new Date(deadlineStr).getTime();
    } else {
      updates.deadline = undefined; // clear deadline
    }
    onSave(task.id, updates);
    onClose();
  };

  return (
    <div className="tm-modal-overlay">
      <div className="tm-modal">
        <div className="tm-modal-header">
          <h3>任务详情</h3>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="tm-modal-content">
          <div className="tm-form-group">
            <label>
              <Type size={14} />
              <span>任务标题</span>
            </label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="输入任务标题..."
            />
          </div>
          <div className="tm-form-group">
            <label>
              <Calendar size={14} />
              <span>截止时间</span>
            </label>
            <input 
              type="datetime-local" 
              value={deadlineStr} 
              onChange={(e) => setDeadlineStr(e.target.value)} 
            />
          </div>
          <div className="tm-form-group">
            <label>
              <AlignLeft size={14} />
              <span>详细内容</span>
            </label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="添加任务的详细补充说明..."
              rows={4}
            />
          </div>
        </div>
        <div className="tm-modal-footer">
          <button className="tm-btn tm-btn-secondary" onClick={onClose}>取消</button>
          <button className="tm-btn tm-btn-primary" onClick={handleSave} disabled={!title.trim()}>保存更改</button>
        </div>
      </div>
    </div>
  );
}
