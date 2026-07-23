import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import dayjs from 'dayjs';
import 'react-day-picker/dist/style.css';

interface DateTimePickerProps {
  value?: number; // Timestamp
  onChange: (value?: number) => void;
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : undefined;
  const timeStr = value ? dayjs(selectedDate).format('HH:mm') : '12:00';

  // Handle outside clicks to close popover
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      return;
    }
    
    // Maintain the existing time if any, else default to 12:00
    const current = value ? new Date(value) : new Date();
    const hours = current.getHours();
    const minutes = current.getMinutes();
    
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    onChange(newDate.getTime());
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [hoursStr, minutesStr] = e.target.value.split(':');
    const hours = parseInt(hoursStr, 10) || 0;
    const minutes = parseInt(minutesStr, 10) || 0;

    const baseDate = selectedDate || new Date();
    const newDate = new Date(baseDate);
    newDate.setHours(hours, minutes, 0, 0);
    onChange(newDate.getTime());
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    setIsOpen(false);
  };

  return (
    <div className="tm-datetime-picker-container" ref={containerRef} style={{ position: 'relative' }}>
      <div 
        className="tm-datetime-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          border: '1px solid rgba(123, 145, 169, 0.25)',
          borderRadius: '8px',
          background: 'var(--surface-1)',
          cursor: 'pointer',
          fontSize: '14px',
          color: value ? 'var(--text-strong)' : 'var(--text-faint)',
          minHeight: '42px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon size={16} style={{ color: 'var(--text-muted)' }} />
          <span>
            {value ? dayjs(selectedDate).format('YYYY-MM-DD HH:mm') : '选择截止日期时间...'}
          </span>
        </div>
        {value && (
          <button 
            type="button" 
            onClick={handleClear} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: 'var(--text-faint)' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div 
          className="tm-datetime-popover"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 1001,
            background: '#ffffff',
            border: '1px solid rgba(123, 145, 169, 0.2)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 16px -6px rgba(0, 0, 0, 0.05)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div className="tm-daypicker-wrapper">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
            />
          </div>

          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              borderTop: '1px solid rgba(123, 145, 169, 0.1)', 
              paddingTop: '12px',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)' }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
              <span>具体时间</span>
            </div>
            <input 
              type="time" 
              value={timeStr}
              onChange={handleTimeChange}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(123, 145, 169, 0.2)',
                outline: 'none',
                fontSize: '13px',
                color: 'var(--text-strong)',
                background: 'var(--surface-1)'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
