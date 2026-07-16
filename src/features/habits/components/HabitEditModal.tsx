import React, { useState, useEffect } from "react";
import type { Habit } from "../habitTypes";

interface HabitEditModalProps {
  habit: Habit | null; // null for create new
  onClose: () => void;
  onSave: (habit: Habit) => void;
}

export const HabitEditModal: React.FC<HabitEditModalProps> = ({ habit, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Habit>>({
    name: "",
    emoji: "😊",
    color: "#4F46E5",
    group: "上午",
    frequency: "每天",
    target: "当天完成打卡",
    startDate: new Date().toISOString().split('T')[0],
    duration: "永远",
    reminderTime: "09:00",
    autoLog: false,
    logs: {}
  });

  useEffect(() => {
    if (habit) {
      setFormData(habit);
    }
  }, [habit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const finalHabit = {
      ...formData,
      id: habit ? habit.id : `habit-${Date.now()}`,
      logs: habit ? habit.logs : {}
    } as Habit;
    
    onSave(finalHabit);
  };

  return (
    <div className="habit-modal-overlay" onClick={onClose}>
      <div 
        className="habit-modal-content p-6" 
        onClick={e => e.stopPropagation()}
        style={{ padding: '1.5rem' }}
      >
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: '#1E293B' }}>
          {habit ? '编辑习惯' : '新建习惯'}
        </h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ 
              width: '3rem', height: '3rem', borderRadius: '0.5rem', 
              backgroundColor: '#ECFDF5', border: '1px solid #D1FAE5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', cursor: 'pointer', flexShrink: 0
            }}>
              {formData.emoji}
            </div>
            <input 
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如: 每日阅读"
              required
              style={{ 
                flex: 1, padding: '0.5rem 1rem', borderRadius: '0.5rem',
                border: '1px solid #E2E8F0', outline: 'none',
                fontSize: '1rem', color: '#1E293B'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '5rem', fontSize: '0.875rem', color: '#64748B' }}>频率</label>
            <select 
              value={formData.frequency}
              onChange={e => setFormData({ ...formData, frequency: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', backgroundColor: '#fff', outline: 'none' }}
            >
              <option value="每天">每天</option>
              <option value="每周">每周</option>
              <option value="每月">每月</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '5rem', fontSize: '0.875rem', color: '#64748B' }}>所属分组</label>
            <select 
              value={formData.group}
              onChange={e => setFormData({ ...formData, group: e.target.value })}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', backgroundColor: '#fff', outline: 'none' }}
            >
              <option value="上午">上午</option>
              <option value="下午">下午</option>
              <option value="晚上">晚上</option>
              <option value="其他">其他</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ width: '5rem', fontSize: '0.875rem', color: '#64748B' }}>提醒时间</label>
            <input 
              type="time"
              value={formData.reminderTime}
              onChange={e => setFormData({ ...formData, reminderTime: e.target.value })}
              style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', backgroundColor: '#fff', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #E2E8F0', backgroundColor: '#fff', cursor: 'pointer' }}
            >
              取消
            </button>
            <button 
              type="submit"
              style={{ padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#4F46E5', color: 'white', cursor: 'pointer', fontWeight: 500 }}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
