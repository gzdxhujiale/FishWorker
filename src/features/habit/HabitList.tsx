import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useHabitStore } from './habitStore';
import { HabitItem } from './HabitItem';
import { EmptyState } from './EmptyState';
import { CreateEditModal } from './CreateEditModal';
import { Habit } from './habitTypes';

interface HabitListProps {
  onHabitClick: (habit: Habit) => void;
}

export const HabitList: React.FC<HabitListProps> = ({ onHabitClick }) => {
  const currentDate = useHabitStore(state => state.currentDate);
  const allHabits = useHabitStore(state => state.habits);
  const getHabitsForDate = useHabitStore(state => state.getHabitsForDate);
  
  const habits = useMemo(() => getHabitsForDate(currentDate), [allHabits, currentDate, getHabitsForDate]);

  const createHabit = useHabitStore(state => state.createHabit);
  
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleCreate = async (data: Partial<Habit>) => {
    if (data.name) {
      await createHabit(data);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fc] overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
        {habits.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-2 mb-3 px-2 text-gray-700 font-medium text-sm cursor-pointer hover:text-gray-900 transition-colors">
              <ChevronDown size={16} className="text-gray-400" />
              <span>上午 {habits.length}</span>
            </div>
            
            <div className="border border-[#b6d0ff] rounded-xl overflow-hidden shadow-sm bg-white pb-1 pt-1 px-1">
              {habits.map(habit => (
                <HabitItem 
                  key={habit.id} 
                  habit={habit} 
                  onClick={onHabitClick} 
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <CreateEditModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
};
