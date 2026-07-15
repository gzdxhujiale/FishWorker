import { useState, useEffect, useRef } from 'react';
import { X, Calendar, AlignLeft, Type } from 'lucide-react';
import { Task } from './timeManagementTypes';
import { DatePicker } from '@arco-design/web-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import dayjs from 'dayjs';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>, isHighFreq?: boolean) => void;
}

export function TaskDetailModal({ task, onClose, onSave }: TaskDetailModalProps) {
  const [title, setTitle] = useState(task.title);
  const [deadline, setDeadline] = useState<number | undefined>(task.deadline);
  
  const [hasTime, setHasTime] = useState<boolean>(() => {
    if (!task.deadline) return false;
    const d = dayjs(task.deadline);
    // If the time is not exactly midnight (00:00:00.000), we assume time is set
    return d.hour() !== 0 || d.minute() !== 0 || d.second() !== 0 || d.millisecond() !== 0;
  });

  // Refs for tracking values during unmount / backdrop close
  const latestTitle = useRef(title);
  const latestDeadline = useRef(deadline);
  const latestDescription = useRef(task.description || '');

  // Keep refs synchronized
  useEffect(() => {
    latestTitle.current = title;
  }, [title]);

  useEffect(() => {
    latestDeadline.current = deadline;
  }, [deadline]);

  // TipTap Editor setup
  const editor = useEditor({
    extensions: [StarterKit],
    content: task.description || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      latestDescription.current = html;
      // Debounce saving of the description (high frequency saving: true)
      triggerAutoSave({ description: html }, true);
    },
  });

  // Keep Tiptap editor content synced if task.description changes from outside
  useEffect(() => {
    if (editor && task.description !== undefined && editor.getHTML() !== task.description) {
      editor.commands.setContent(task.description);
      latestDescription.current = task.description;
    }
  }, [task.description, editor]);

  // Timers map for debounced saves
  const timers = useRef<Record<string, number>>({});

  const triggerAutoSave = (updates: Partial<Task>, isHighFreq = true) => {
    const key = Object.keys(updates)[0];
    if (timers.current[key]) {
      window.clearTimeout(timers.current[key]);
    }

    // Perform the save after a delay: 500ms
    timers.current[key] = window.setTimeout(() => {
      onSave(task.id, updates, isHighFreq);
      delete timers.current[key];
    }, 500);
  };

  // Immediate save trigger to flush any pending saves
  const flushSaves = () => {
    // Clear all pending save timeouts
    Object.keys(timers.current).forEach(key => {
      window.clearTimeout(timers.current[key]);
    });
    timers.current = {};

    // Build updates comparing against the original task props
    const updates: Partial<Task> = {};
    if (latestTitle.current.trim() && latestTitle.current !== task.title) {
      updates.title = latestTitle.current.trim();
    }
    if (latestDeadline.current !== task.deadline) {
      updates.deadline = latestDeadline.current;
    }
    const finalDesc = latestDescription.current === '<p></p>' ? '' : latestDescription.current;
    const originalDesc = task.description || '';
    if (finalDesc !== originalDesc) {
      updates.description = finalDesc || undefined;
    }

    if (Object.keys(updates).length > 0) {
      onSave(task.id, updates, false); // Instant sync to backend
    }
  };

  // Flush saves on manual close
  const handleClose = () => {
    flushSaves();
    onClose();
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerAutoSave({ title: newTitle.trim() }, true);
  };

  const handleDeadlineChange = (newDeadlineStr: string) => {
    const newDeadline = newDeadlineStr ? dayjs(newDeadlineStr).valueOf() : undefined;
    setDeadline(newDeadline);
    // Date/time changes are instantly saved to keep calendars correct
    onSave(task.id, { deadline: newDeadline }, false);
  };

  return (
    <div 
      className="tm-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="tm-modal">
        <div className="tm-modal-header">
          <h3>任务详情</h3>
          <button className="icon-button" onClick={handleClose}>
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
              onChange={(e) => handleTitleChange(e.target.value)} 
              placeholder="输入任务标题..."
              onBlur={() => {
                if (title.trim() === '') {
                  setTitle(task.title); // Restore original if empty
                } else {
                  flushSaves();
                }
              }}
            />
          </div>
          <div className="tm-form-group">
            <label>
              <Calendar size={14} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>截止时间</span>
                {deadline && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setHasTime(!hasTime);
                      // Update deadline to clear or keep time
                      if (deadline) {
                        const d = dayjs(deadline);
                        const newDeadline = hasTime 
                          ? d.startOf('day').valueOf() 
                          : d.hour(12).minute(0).valueOf();
                        setDeadline(newDeadline);
                        onSave(task.id, { deadline: newDeadline }, false);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-color, #165dff)',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    {hasTime ? '移除时间' : '添加时间'}
                  </button>
                )}
              </div>
            </label>
            <DatePicker 
              showTime={hasTime}
              format={hasTime ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD"}
              value={deadline ? dayjs(deadline) : undefined}
              onChange={handleDeadlineChange}
              placeholder="选择截止日期..."
              style={{ width: '100%', borderRadius: '8px', minHeight: '40px' }}
            />
          </div>
          <div className="tm-form-group">
            <label>
              <AlignLeft size={14} />
              <span>详细内容</span>
            </label>
            <div className="note-drawer-editor-container" style={{ border: '1px solid rgba(123, 145, 169, 0.25)', borderRadius: '8px', padding: '10px 12px', minHeight: '120px', background: 'var(--surface-1)' }}>
              <EditorContent 
                editor={editor}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
