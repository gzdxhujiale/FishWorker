import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Smile, Edit2, X } from 'lucide-react';
import { Habit } from './habitTypes';

interface CreateEditModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (data: Partial<Habit>) => Promise<void>;
  initialData?: Habit | null;
}

export const CreateEditModal: React.FC<CreateEditModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  initialData
}) => {
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('everyday');
  const [goal, setGoal] = useState('today');
  const [duration, setDuration] = useState('forever');
  const [group, setGroup] = useState('other');
  const [autoPopupLog, setAutoPopupLog] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible && initialData) {
      setName(initialData.name || '');
      setFrequency(initialData.frequency || 'everyday');
      setGoal(initialData.goal || 'today');
      setDuration(initialData.duration || 'forever');
      setGroup(initialData.group || 'other');
      setAutoPopupLog(initialData.autoPopupLog || false);
      setStartDate(initialData.startDate || '');
      setErrorMsg('');
    } else if (visible) {
      setName('');
      setFrequency('everyday');
      setGoal('today');
      setDuration('forever');
      setGroup('other');
      setAutoPopupLog(false);
      setStartDate('');
      setErrorMsg('');
    }
  }, [visible, initialData]);

  if (!visible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('请输入习惯名称');
      return;
    }
    setErrorMsg('');
    await onSubmit({
      name: name.trim(),
      frequency,
      goal,
      duration,
      group,
      autoPopupLog,
      startDate: startDate || undefined
    });
    onCancel();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-lg text-gray-800">
            {initialData ? '编辑习惯' : '添加习惯'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Icon & Name */}
          <div className="flex items-center gap-4 mb-2">
            <div className="relative cursor-pointer flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-[#a8e063] flex items-center justify-center shadow-sm">
                <Smile className="text-yellow-400" size={32} fill="currentColor" />
              </div>
              <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                <Edit2 size={12} className="text-gray-500" />
              </div>
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="每天进步一点点"
                className={`w-full h-12 px-4 rounded-xl border text-base outline-none transition-colors ${
                  errorMsg ? 'border-red-400 bg-red-50/50' : 'border-gray-200 focus:border-blue-500 bg-gray-50/30'
                }`}
              />
              {errorMsg && <p className="text-xs text-red-500 mt-1 pl-1">{errorMsg}</p>}
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-4 items-center gap-3">
              <label className="text-sm font-medium text-gray-700 text-right">频率</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="col-span-3 h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="everyday">每天</option>
                <option value="weekly">每周</option>
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-3">
              <label className="text-sm font-medium text-gray-700 text-right">目标</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="col-span-3 h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="today">当天完成打卡</option>
                <option value="times">完成特定次数</option>
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-3">
              <label className="text-sm font-medium text-gray-700 text-right">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="col-span-3 h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-blue-500 cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-3">
              <label className="text-sm font-medium text-gray-700 text-right flex items-center justify-end gap-1">
                <span>坚持天数</span>
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="col-span-3 h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="forever">永远</option>
                <option value="21days">21天</option>
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-3">
              <label className="text-sm font-medium text-gray-700 text-right">所属分组</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="col-span-3 h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="other">其他</option>
                <option value="health">健康</option>
                <option value="learning">学习</option>
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-3 pt-2">
              <div />
              <label className="col-span-3 flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={autoPopupLog}
                  onChange={(e) => setAutoPopupLog(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>自动弹出打卡日志</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#4a72ff] hover:bg-blue-600 text-white text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
