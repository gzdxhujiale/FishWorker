import { useState, useRef, useEffect } from 'react';
import { BookOpen, LayoutList, Columns, ChevronDown, Check, Plus } from 'lucide-react';
import { ViewType, Folder, List } from './listsTypes';

interface AddListModalProps {
  folders: Folder[];
  initialFolderId?: string;
  initialData?: List;
  onClose: () => void;
  onAdd: (data: { name: string; color: string; viewType: ViewType; folderId: string | null; icon: string }, newFolderName?: string) => void;
  onAddFolder: (name: string) => Folder;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#3b82f6', '#6366f1', '#a855f7'];

export function AddListModal({ folders, initialFolderId, initialData, onClose, onAdd, onAddFolder }: AddListModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [color, setColor] = useState(initialData?.color || COLORS[6]);
  const [viewType, setViewType] = useState<ViewType>(initialData?.viewType || 'list');
  const [folderId, setFolderId] = useState<string | null>(initialData?.folderId !== undefined ? initialData.folderId : (initialFolderId || null));
  
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFolderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({ name, color, viewType, folderId, icon: 'BookOpen' });
  };

  const getFolderDisplay = () => {
    if (!folderId) return '无';
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : '无';
  };

  return (
    <div 
      className="list-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="list-modal-content">
        <div className="list-modal-header">
          <h2>{initialData ? '编辑清单' : '添加清单'}</h2>
        </div>
        
        <div className="list-modal-body">
          <div className="list-form-group">
            <div className="list-name-input-wrapper">
              <BookOpen size={16} className="icon-prefix" />
              <input 
                type="text" 
                placeholder="名称" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="list-form-group">
            <div className="list-form-label">颜色</div>
            <div className="color-picker">
              <div 
                className={`color-swatch ${color === 'none' ? 'selected' : ''}`}
                style={{ border: '1px solid #ccc', background: 'transparent' }}
                onClick={() => setColor('none')}
              />
              {COLORS.map(c => (
                <div 
                  key={c}
                  className={`color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="list-form-group">
            <div className="list-form-label">视图</div>
            <div className="view-type-toggle">
              <button 
                className={`view-type-btn ${viewType === 'list' ? 'active' : ''}`}
                onClick={() => setViewType('list')}
              >
                <LayoutList size={16} />
              </button>
              <button 
                className={`view-type-btn ${viewType === 'board' ? 'active' : ''}`}
                onClick={() => setViewType('board')}
              >
                <Columns size={16} />
              </button>
            </div>
          </div>

          <div className="list-form-group">
            <div className="list-form-label">文件夹</div>
            <div className="folder-select-wrapper" ref={dropdownRef}>
              <div 
                className="folder-select-dropdown" 
                onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
              >
                <span>{getFolderDisplay()}</span>
                <ChevronDown size={16} color="var(--text-faint)" />
              </div>
              
              {isFolderDropdownOpen && (
                <div className="folder-dropdown-menu">
                  <div 
                    className="folder-dropdown-item"
                    onClick={() => { setFolderId(null); setIsFolderDropdownOpen(false); }}
                  >
                    无 {folderId === null && <Check size={16} className="check-icon" />}
                  </div>
                  {folders.map(f => (
                    <div 
                      key={f.id}
                      className="folder-dropdown-item"
                      onClick={() => { setFolderId(f.id); setIsFolderDropdownOpen(false); }}
                    >
                      {f.name} {folderId === f.id && <Check size={16} className="check-icon" />}
                    </div>
                  ))}
                  <div 
                    className="folder-dropdown-item action"
                    onClick={(e) => e.stopPropagation()}
                    style={{ borderTop: '1px solid var(--line-soft)', padding: '8px 12px' }}
                  >
                    <Plus size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input 
                      type="text" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="新建文件夹..."
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13px', background: 'transparent', marginLeft: '4px' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          if (newFolderName.trim()) {
                            const newFolder = onAddFolder(newFolderName.trim());
                            setFolderId(newFolder.id);
                            setNewFolderName('');
                            setIsFolderDropdownOpen(false);
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="list-modal-footer">
          <button className="list-modal-btn primary" onClick={handleAdd} disabled={!name.trim()}>{initialData ? '保存' : '添加'}</button>
          <button className="list-modal-btn" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
