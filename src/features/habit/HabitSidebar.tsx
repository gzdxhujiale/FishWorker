import React, { useState } from 'react';
import { Dropdown, Menu } from '@arco-design/web-react';
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

  const menu = (
    <Menu>
      <Menu.Item key="edit" onClick={() => setIsEditModalVisible(true)}>
        <div className="flex items-center gap-2">
          <Edit size={14} /> 编辑
        </div>
      </Menu.Item>
      <Menu.Item key="delete" onClick={handleDelete}>
        <div className="flex items-center gap-2 text-red-500">
          <Trash2 size={14} /> 删除
        </div>
      </Menu.Item>
    </Menu>
  );

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
          <Dropdown droplist={menu} trigger="click" position="br">
            <button className="p-2 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer">
              <MoreHorizontal size={24} />
            </button>
          </Dropdown>
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
