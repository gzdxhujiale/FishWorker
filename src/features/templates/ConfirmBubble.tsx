import React from 'react';
import { ConfirmDeleteDialog } from '../../components/ui/ConfirmDeleteDialog';

interface ConfirmBubbleProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const ConfirmBubble: React.FC<ConfirmBubbleProps> = ({
  isOpen,
  message,
  onConfirm,
  onCancel,
  children,
}) => {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <ConfirmDeleteDialog
        isOpen={isOpen}
        title="确认删除"
        description={message}
        confirmText="确定"
        cancelText="取消"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    </div>
  );
};
