import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Smile } from 'lucide-react';
import { Habit } from './habitTypes';
import { useHabitStore } from './habitStore';
import { OverviewCards } from './OverviewCards';
import { CalendarHeatmapComponent } from './CalendarHeatmapComponent';
import { CreateEditModal } from './CreateEditModal';

interface HabitSidebarProps {
  habit: Habit;
  onClose: () => void;
}

export const HabitSidebar: React.FC<HabitSidebarProps> = ({ habit, onClose }) => {
  const deleteHabit = useHabitStore(state => state.deleteHabit);
  const updateHabit = useHabitStore(state => state.updateHabit);
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const handleDelete = () => {
    if (window.confirm('确定要删除这个习惯吗？该习惯的所有历史打卡记录也将被永久删除。')) {
      deleteHabit(habit.id).then(() => {
        onClose();
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fc]">
      {/* Header */}
      <div className="h-[10%] min-h-[72px] flex items-center justify-between px-6 flex-shrink-0 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#a8e063] flex items-center justify-center shadow-sm">
            <Smile className="text-yellow-400" size={24} fill="currentColor" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 truncate">{habit.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="p-2 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer rounded-lg hover:bg-gray-200/50 outline-none">
                <MoreHorizontal size={24} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="min-w-[140px] bg-white rounded-xl p-1.5 shadow-lg border border-gray-100 z-50">
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer outline-none"
                  onSelect={() => setIsEditModalVisible(true)}
                >
                  <Edit size={14} /> 编辑
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg cursor-pointer outline-none"
                  onSelect={handleDelete}
                >
                  <Trash2 size={14} /> 删除
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">
        
        {/* Overview Cards */}
        <div className="flex-shrink-0">
          <OverviewCards habit={habit} />
        </div>

        {/* Calendar Heatmap Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-50 p-4 pb-6 flex-shrink-0 mb-6">
          <CalendarHeatmapComponent habit={habit} />
        </div>
        
      </div>

      <CreateEditModal
        visible={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onSubmit={async (data) => {
          if (data.name) {
            await updateHabit(habit.id, data);
          }
          setIsEditModalVisible(false);
        }}
        initialData={habit}
      />
    </div>
  );
};
