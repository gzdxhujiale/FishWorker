import { useState, useEffect } from 'react';
import { X, Sidebar, ExternalLink, Check } from 'lucide-react';
import { getNoteOpenMode, setNoteOpenMode, NoteOpenMode } from './noteOpenService';

interface ListSettingsModalProps {
  onClose: () => void;
  showToast?: (message: string, type?: 'success' | 'error') => void;
}

export function ListSettingsModal({ onClose, showToast }: ListSettingsModalProps) {
  const [openMode, setOpenMode] = useState<NoteOpenMode>('sidebar');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOpenMode(getNoteOpenMode());
  }, []);

  const handleSelectMode = async (mode: NoteOpenMode) => {
    setOpenMode(mode);
    setIsSaving(true);
    try {
      await setNoteOpenMode(mode);
      if (showToast) {
        showToast(`已成功将笔记弹出方式切换为：${mode === 'sidebar' ? '侧边栏弹出' : '新窗口弹出'}`);
      }
    } catch (e) {
      console.error('Failed to save note open mode preference:', e);
      if (showToast) {
        showToast('保存配置失败', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(2px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '460px',
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--line-soft, #e5e7eb)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--line-soft, #f3f4f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-strong, #111827)' }}>
            清单设置
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-muted, #9ca3af)',
              padding: '4px',
              borderRadius: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-strong, #374151)',
                marginBottom: '8px',
              }}
            >
              笔记弹出方式
            </label>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-muted, #6b7280)' }}>
              选择点击笔记列表条目时的打开方式。设置将自动保存并同步至数据库 (SQLite + TiDB)。
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Sidebar Option */}
              <div
                onClick={() => handleSelectMode('sidebar')}
                style={{
                  border: `2px solid ${openMode === 'sidebar' ? 'var(--primary-color, #3b82f6)' : 'var(--line-soft, #e5e7eb)'}`,
                  background: openMode === 'sidebar' ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-app, #f9fafb)',
                  borderRadius: '8px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Sidebar size={20} color={openMode === 'sidebar' ? 'var(--primary-color, #3b82f6)' : '#6b7280'} />
                  {openMode === 'sidebar' && (
                    <span style={{ color: 'var(--primary-color, #3b82f6)' }}>
                      <Check size={16} />
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-strong, #111827)' }}>
                    侧边栏弹出
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #6b7280)', marginTop: '2px' }}>
                    在主界面右侧滑出抽屉编辑
                  </div>
                </div>
              </div>

              {/* Window Option */}
              <div
                onClick={() => handleSelectMode('window')}
                style={{
                  border: `2px solid ${openMode === 'window' ? 'var(--primary-color, #3b82f6)' : 'var(--line-soft, #e5e7eb)'}`,
                  background: openMode === 'window' ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-app, #f9fafb)',
                  borderRadius: '8px',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <ExternalLink size={20} color={openMode === 'window' ? 'var(--primary-color, #3b82f6)' : '#6b7280'} />
                  {openMode === 'window' && (
                    <span style={{ color: 'var(--primary-color, #3b82f6)' }}>
                      <Check size={16} />
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-strong, #111827)' }}>
                    新窗口弹出
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #6b7280)', marginTop: '2px' }}>
                    在独立的窗口中多任务并发编辑
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--line-soft, #f3f4f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            background: 'var(--bg-app, #f9fafb)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '6px 16px',
              fontSize: '13px',
              fontWeight: 500,
              borderRadius: '6px',
              border: '1px solid var(--line-soft, #d1d5db)',
              background: '#ffffff',
              color: '#374151',
              cursor: 'pointer',
            }}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
