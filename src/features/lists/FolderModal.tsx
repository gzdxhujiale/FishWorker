import { useState } from 'react';
import { Folder as FolderIcon } from 'lucide-react';
import { Folder } from './listsTypes';

interface FolderModalProps {
  initialData?: Folder;
  onClose: () => void;
  onSave: (name: string) => void;
}

export function FolderModal({ initialData, onClose, onSave }: FolderModalProps) {
  const [name, setName] = useState(initialData?.name || '');

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
    }
  };

  return (
    <div className="list-modal-overlay">
      <div className="list-modal-content" style={{ width: '400px' }}>
        <div className="list-modal-header">
          <h2>{initialData ? '编辑文件夹' : '添加文件夹'}</h2>
        </div>
        
        <div className="list-modal-body" style={{ paddingTop: '16px' }}>
          <div className="list-form-group">
            <div className="list-name-input-wrapper" style={{ width: '100%' }}>
              <FolderIcon size={16} className="icon-prefix" />
              <input 
                type="text" 
                placeholder="文件夹名称" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="list-modal-footer">
          <button className="list-modal-btn primary" onClick={handleSave} disabled={!name.trim()}>{initialData ? '保存' : '添加'}</button>
          <button className="list-modal-btn" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
