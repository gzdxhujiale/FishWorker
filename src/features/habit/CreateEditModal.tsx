import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Checkbox, Button } from '@arco-design/web-react';
import { Smile, Edit2, Plus } from 'lucide-react';
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
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible && initialData) {
      form.setFieldsValue({ 
        name: initialData.name,
        frequency: initialData.frequency || 'everyday',
        goal: initialData.goal || 'today',
        duration: initialData.duration || 'forever',
        group: initialData.group || 'other',
        autoPopupLog: initialData.autoPopupLog || false,
        startDate: initialData.startDate,
        reminder: initialData.reminder
      });
    } else if (visible) {
      form.resetFields();
      form.setFieldsValue({
        frequency: 'everyday',
        goal: 'today',
        duration: 'forever',
        group: 'other',
        autoPopupLog: false,
        startDate: undefined,
        reminder: undefined
      });
    }
  }, [visible, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validate();
      await onSubmit(values);
      onCancel();
    } catch (e) {
      // Validation error
    }
  };

  return (
    <Modal
      title={<div className="font-bold text-lg">{initialData ? '编辑习惯' : '添加习惯'}</div>}
      visible={visible}
      onOk={handleOk}
      onCancel={onCancel}
      autoFocus={false}
      focusLock={true}
      className="rounded-2xl"
      okButtonProps={{ className: "bg-[#4a72ff] rounded-lg", shape: 'round' }}
      cancelButtonProps={{ className: "rounded-lg", shape: 'round' }}
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="horizontal" labelAlign="left" labelCol={{ span: 5 }} wrapperCol={{ span: 19 }}>
        
        {/* Name and Icon Row */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative cursor-pointer">
            <div className="w-14 h-14 rounded-full bg-[#a8e063] flex items-center justify-center shadow-sm">
              <Smile className="text-yellow-400" size={32} fill="currentColor" />
            </div>
            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm border border-gray-100">
              <Edit2 size={12} className="text-gray-500" />
            </div>
          </div>
          <Form.Item
            field="name"
            rules={[{ required: true, message: '请输入习惯名称' }]}
            noStyle
          >
            <Input 
              className="flex-1 rounded-xl h-12 text-lg border-blue-200 focus:border-blue-500 focus:bg-white transition-colors" 
              placeholder="每天进步一点点" 
            />
          </Form.Item>
        </div>

        <Form.Item label="频率" field="frequency">
          <Select className="rounded-lg h-10">
            <Select.Option value="everyday">每天</Select.Option>
            <Select.Option value="weekly">每周</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="目标" field="goal">
          <Select className="rounded-lg h-10">
            <Select.Option value="today">当天完成打卡</Select.Option>
            <Select.Option value="times">完成特定次数</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="开始日期" field="startDate">
          <DatePicker className="rounded-lg h-10 w-full" placeholder="7月20日" />
        </Form.Item>

        <Form.Item label={<span>坚持天数 <span className="text-gray-400 cursor-help">?</span></span>} field="duration">
          <Select className="rounded-lg h-10">
            <Select.Option value="forever">永远</Select.Option>
            <Select.Option value="21days">21天</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="所属分组" field="group">
          <Select className="rounded-lg h-10">
            <Select.Option value="other">其他</Select.Option>
            <Select.Option value="health">健康</Select.Option>
            <Select.Option value="learning">学习</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="提醒" field="reminder">
          <Button icon={<Plus />} className="rounded-lg text-gray-500 bg-gray-50 border border-gray-200" />
        </Form.Item>

        <Form.Item field="autoPopupLog" triggerPropName="checked" className="mb-0 mt-6">
          <Checkbox className="text-gray-700">自动弹出打卡日志</Checkbox>
        </Form.Item>
        
      </Form>
    </Modal>
  );
};
