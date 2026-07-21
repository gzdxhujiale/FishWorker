import React, { useEffect, useState } from 'react';
import { useHabitStore } from './habitStore';
import { DateSwitcher } from './DateSwitcher';
import { HabitList } from './HabitList';
import { Habit } from './habitTypes';
import { HabitSidebar } from './HabitSidebar';
import { ChevronDown, LayoutGrid, Plus, MoreHorizontal } from 'lucide-react';
import { CreateEditModal } from './CreateEditModal';

export const HabitPanel: React.FC = () => {
  const loadAll = useHabitStore(state => state.loadAll);
  const currentDate = useHabitStore(state => state.currentDate);
  const setCurrentDate = useHabitStore(state => state.setCurrentDate);
  const createHabit = useHabitStore(state => state.createHabit);
  const habits = useHabitStore(state => state.habits);
  
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);

  useEffect(() => {
    if (selectedHabit) {
      const updated = habits.find(h => h.id === selectedHabit.id);
      if (updated && updated !== selectedHabit) {
        setSelectedHabit(updated);
      }
    }
  }, [habits, selectedHabit]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleHabitClick = (habit: Habit) => {
    setSelectedHabit(habit);
  };

  const handleCloseSidebar = () => {
    setSelectedHabit(null);
  };

  const handleCreate = async (data: Partial<Habit>) => {
    if (data.name) {
      await createHabit(data);
    }
  };

  return (
    <div className="flex w-full h-full bg-[#f8f9fc] relative overflow-hidden">
      {/* Main Content Area */}
      <div className="flex flex-col flex-1 w-full h-full transition-all duration-300">
        
        {/* Top Header & Date Switcher */}
        <div className="flex-shrink-0 bg-white z-20 shadow-sm border-b border-gray-100 flex flex-col pt-4">
          <div className="flex items-center justify-between px-6 pb-2">
            <div className="flex items-center gap-1 cursor-pointer">
              <h1 className="text-xl font-bold text-gray-800">习惯</h1>
              <ChevronDown size={20} className="text-gray-400" />
            </div>
            <div className="flex items-center gap-4 text-gray-600">
              <LayoutGrid size={20} className="cursor-pointer hover:text-gray-800" />
              <Plus 
                size={24} 
                className="cursor-pointer hover:text-gray-800" 
                onClick={() => setIsCreateModalVisible(true)}
              />
              <MoreHorizontal size={20} className="cursor-pointer hover:text-gray-800" />
            </div>
          </div>
          <DateSwitcher currentDate={currentDate} onChange={setCurrentDate} />
        </div>

        {/* Bottom 70%: Habit List Area */}
        <div className="h-[70%] flex-1 bg-gray-50 relative z-10 overflow-hidden flex flex-col">
          <HabitList onHabitClick={handleHabitClick} />
        </div>

      </div>

      {/* Sidebar Overlay (Phase 4 Placeholder) */}
      {selectedHabit && (
        <>
          <div 
            className="absolute inset-0 bg-black/20 z-40 transition-opacity backdrop-blur-sm"
            onClick={handleCloseSidebar}
          />
          <div className="absolute top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300">
            <HabitSidebar habit={selectedHabit} onClose={handleCloseSidebar} />
          </div>
        </>
      )}

      <CreateEditModal
        visible={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
};
