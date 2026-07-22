import { useState, useEffect, useMemo } from 'react';
import { ArrowDownUp, MoreHorizontal, Plus, PanelLeftClose, PanelLeftOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useListsStore } from './listsStore';
import { List, Folder, ViewType, Note, Template } from './listsTypes';
import { ListsSidebar } from './ListsSidebar';
import { AddListModal } from './AddListModal';
import { FolderModal } from './FolderModal';
import { NoteDrawer } from './NoteDrawer';
import { TemplateModal, useTemplateStore } from '../templates';
import { NoteItem } from './NoteItem';
import { NoteGroupView } from './NoteGroupView';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import * as listsService from './listsService';
import { computeNoteReorder } from './listsReorder';
import { BatchExportModal } from './BatchExportModal';
import { convertMarkdownToTipTapJson, convertTipTapJsonToMarkdown } from '../reactjs-tiptap-v1';
import './lists.css';

export function ListsPanel() {
  const store = useListsStore();
  
  const lists = useMemo(() => {
    return [...store.data.lists].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }, [store.data.lists]);

  const folders = useMemo(() => {
    return [...store.data.folders].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }, [store.data.folders]);

  const templates = useTemplateStore(state => state.templates);
  const updateTemplate = useTemplateStore(state => state.updateTemplate);
  const deleteTemplate = useTemplateStore(state => state.deleteTemplate);

  const [activeListId, setActiveListId] = useState<string | null>(() => {
    return localStorage.getItem('lists-active-list-id');
  });

  const notes = useMemo(() => {
    if (!activeListId) return [];
    return store.data.notes
      .filter(n => n.listId === activeListId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.sortOrder !== b.sortOrder) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }
        return b.updatedAt - a.updatedAt;
      });
  }, [store.data.notes, activeListId]);

  const noteGroups = useMemo(() => {
    if (!activeListId) return [];
    return store.data.noteGroups
      .filter(g => g.listId === activeListId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [store.data.noteGroups, activeListId]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('lists-sidebar-collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('lists-sidebar-collapsed', String(next));
      return next;
    });
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialFolderId, setAddModalInitialFolderId] = useState<string | undefined>();
  const [editListTarget, setEditListTarget] = useState<List | undefined>();

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editFolderTarget, setEditFolderTarget] = useState<Folder | undefined>();

  // Note state
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const activeNote = useMemo(() => {
    if (!activeNoteId) return null;
    return store.data.notes.find(n => n.id === activeNoteId) || null;
  }, [store.data.notes, activeNoteId]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [activeDragNoteId, setActiveDragNoteId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  // Template state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [batchExportModalOpen, setBatchExportModalOpen] = useState(false);

  // Toast state
  interface ToastMessage {
    id: string;
    message: string;
    type: 'success' | 'error';
    isFadingOut?: boolean;
  }
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev =>
        prev.map(t => (t.id === id ? { ...t, isFadingOut: true } : t))
      );
    }, 2700);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    store.init().then(() => {
      const loadedLists = store.getLists();
      
      if (loadedLists.length > 0) {
        const savedId = localStorage.getItem('lists-active-list-id');
        const exists = savedId && loadedLists.some(l => l.id === savedId);

        if (!exists) {
          const loadedFolders = store.getFolders();
          let defaultListId = loadedLists[0].id;

          if (loadedFolders.length > 0) {
            const firstFolder = loadedFolders[0];
            const folderLists = loadedLists.filter(l => l.folderId === firstFolder.id);
            if (folderLists.length > 0) {
              folderLists.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return (a.sortOrder || 0) - (b.sortOrder || 0);
              });
              defaultListId = folderLists[0].id;
            }
          }

          setActiveListId(defaultListId);
          localStorage.setItem('lists-active-list-id', defaultListId);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeListId) {
      setActiveNoteId(null);
      setIsDrawerOpen(false);
      localStorage.setItem('lists-active-list-id', activeListId);
    } else {
      localStorage.removeItem('lists-active-list-id');
    }
  }, [activeListId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveDragNoteId(String(event.active.id));
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    if (!over) {
      setDragOverGroupId(null);
      return;
    }
    const overId = String(over.id);
    if (over.data?.current?.type === 'group') {
      setDragOverGroupId(overId === 'ungrouped' ? 'ungrouped' : overId);
    } else {
      const overNote = notes.find(n => n.id === overId);
      if (overNote) setDragOverGroupId(overNote.groupId || 'ungrouped');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragNoteId(null);
    setDragOverGroupId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const overId = String(over.id);
    const overData = over.data?.current as { type?: string } | undefined;

    let overType: 'group' | 'note' | 'other' = 'other';
    let overGroupId: string | null | undefined = undefined;
    if (overData?.type === 'group') {
      overType = 'group';
      overGroupId = overId === 'ungrouped' ? null : overId;
    } else if (notes.some(n => n.id === overId)) {
      overType = 'note';
    }

    const action = computeNoteReorder({
      activeId: String(active.id),
      overId,
      notes,
      overType,
      overGroupId,
    });

    switch (action.kind) {
      case 'reorder':
        store.reorderNotes(action.newOrder);
        break;
      case 'move':
        store.moveNoteAndReorder(String(active.id), action.targetGroup, action.targetIndex);
        break;
    }
  };

  // --- List Handlers ---
  const handleAddListClick = (folderId?: string) => {
    setEditListTarget(undefined);
    setAddModalInitialFolderId(folderId);
    setIsAddModalOpen(true);
  };

  const handleAddFolder = (name: string) => {
    return store.addFolder(name);
  };

  const handleAddList = (data: { name: string; color: string; viewType: ViewType; folderId: string | null; icon: string }, newFolderName?: string) => {
    let finalFolderId = data.folderId;
    if (newFolderName) {
      const newFolder = store.addFolder(newFolderName);
      finalFolderId = newFolder.id;
    }
    if (editListTarget) {
      store.updateList(editListTarget.id, {
        name: data.name,
        color: data.color,
        viewType: data.viewType,
        folderId: finalFolderId,
        icon: data.icon,
      });
    } else {
      const newList = store.addList({
        name: data.name,
        color: data.color,
        viewType: data.viewType,
        folderId: finalFolderId,
        icon: data.icon,
      });
      setActiveListId(newList.id);
    }
    setIsAddModalOpen(false);
    setEditListTarget(undefined);
  };

  // --- Sidebar Actions ---
  const handleEditFolder = (folder: Folder) => {
    setEditFolderTarget(folder);
    setIsFolderModalOpen(true);
  };

  const handleSaveFolder = (name: string) => {
    if (editFolderTarget) {
      store.updateFolder(editFolderTarget.id, { name });
    }
    setIsFolderModalOpen(false);
    setEditFolderTarget(undefined);
  };

  const handlePinFolder = (folder: Folder) => {
    store.updateFolder(folder.id, { isPinned: !folder.isPinned });
  };

  const handleDissolveFolder = (folder: Folder) => {
    store.deleteFolder(folder.id);
  };

  const handleEditList = (list: List) => {
    setEditListTarget(list);
    setIsAddModalOpen(true);
  };

  const handlePinList = (list: List) => {
    store.updateList(list.id, { isPinned: !list.isPinned });
  };

  const handleDuplicateList = (list: List) => {
    const newList = store.duplicateList(list);
    setActiveListId(newList.id);
  };

  const handleDeleteList = (list: List) => {
    store.deleteList(list.id);
    if (activeListId === list.id) setActiveListId(null);
  };

  // --- Note Actions ---
  const handleAddNote = () => {
    if (!activeListId || !newNoteTitle.trim()) return;
    const newNote = store.addNote({
      listId: activeListId,
      title: newNoteTitle.trim(),
      content: '',
    });
    setNewNoteTitle('');
    setActiveNoteId(newNote.id);
    setIsDrawerOpen(true);
  };

  const handleBatchImport = async () => {
    if (!activeListId) return;
    try {
      const importedFiles = await listsService.pickMultipleMarkdownFiles();
      for (const file of importedFiles) {
        const jsonContent = convertMarkdownToTipTapJson(file.content);
        store.addNote({
          listId: activeListId,
          title: file.title,
          content: jsonContent,
        });
      }
      showToast(`已成功导入 ${importedFiles.length} 条笔记！`);
    } catch (err) {
      console.warn('Batch import cancelled or failed:', err);
    }
  };

  const handleBatchExport = async (selectedNoteIds: string[]) => {
    const notesToExport = notes.filter(n => selectedNoteIds.includes(n.id));
    if (notesToExport.length === 0) return;

    const files = notesToExport.map(n => ({
      title: n.title,
      content: convertTipTapJsonToMarkdown(n.content || ''),
    }));

    try {
      await listsService.saveMultipleMarkdownFiles(files);
      setBatchExportModalOpen(false);
      showToast(`已成功导出 ${files.length} 条笔记！`);
    } catch (err) {
      console.warn('Batch export cancelled or failed:', err);
    }
  };

  const handleNoteUpdate = (id: string, title: string, content: string) => {
    store.updateNote(id, { title, content });
  };

  const handlePinNote = (note: Note) => {
    store.updateNote(note.id, { isPinned: !note.isPinned });
  };

  const handleDuplicateNote = (note: Note) => {
    const newNote = store.addNote({
      listId: note.listId,
      title: note.title + ' (副本)',
      content: note.content,
    });
    setActiveNoteId(newNote.id);
    setIsDrawerOpen(true);
  };

  const handleSaveAsTemplate = (note: Note) => {
    store.addTemplate(note.title || '自定义模板', note.content);
    showToast('已保存为模板！');
  };

  const handleDeleteNote = (note: Note) => {
    store.deleteNote(note.id);
    if (activeNoteId === note.id) {
      setActiveNoteId(null);
      setIsDrawerOpen(false);
    }
  };

  const ensureJsonFormat = (text: string) => {
    if (!text) return JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }
    const lines = text.split('\n');
    const content = lines.map(line => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : []
    }));
    return JSON.stringify({ type: 'doc', content });
  };

  const handleSelectTemplate = (template: Template) => {
    if (!activeNoteId) return;
    const jsonContent = ensureJsonFormat(template.content);
    store.updateNote(activeNoteId, { content: jsonContent });
    setIsTemplateModalOpen(false);
  };

  const handleEditTemplate = (id: string, name: string, content: string) => {
    updateTemplate(id, { name, content });
  };

  const handleDeleteTemplate = (id: string) => {
    deleteTemplate(id);
  };

  // --- Group Actions ---
  const handleAddGroupClick = () => {
    setIsAddingGroup(true);
    setNewGroupName('');
  };

  const handleConfirmAddGroup = () => {
    if (!activeListId) return;
    if (newGroupName.trim()) {
      store.addGroup(activeListId, newGroupName.trim());
    }
    setIsAddingGroup(false);
  };

  const handleRenameGroup = (id: string, name: string) => {
    store.updateGroup(id, { name });
  };

  const handleDeleteGroup = (id: string) => {
    store.deleteGroup(id);
  };

  const handleMoveNote = (note: Note, targetListId: string) => {
    store.updateNote(note.id, { listId: targetListId, groupId: null });
    if (activeNoteId === note.id && activeListId !== targetListId) {
      setActiveNoteId(null);
      setIsDrawerOpen(false);
    }
  };

  const activeList = lists.find(l => l.id === activeListId);

  return (
    <section className="lists-page">
      <ListsSidebar
        lists={lists}
        folders={folders}
        activeListId={activeListId}
        onSelectList={setActiveListId}
        onAddClick={handleAddListClick}
        onEditFolder={handleEditFolder}
        onPinFolder={handlePinFolder}
        onDissolveFolder={handleDissolveFolder}
        onEditList={handleEditList}
        onPinList={handlePinList}
        onDuplicateList={handleDuplicateList}
        onDeleteList={handleDeleteList}
        onDataChange={() => {}} // No longer needed with Zustand
        isCollapsed={isSidebarCollapsed}
      />

      <main className="lists-main-content" onClick={() => setListMenuOpen(false)}>
        {activeList ? (
          <>
            <div className="lists-content-header">
              <div className="lists-content-title">
                <div className="lists-menu-icon" onClick={toggleSidebar} title={isSidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}>
                  <MenuIcon isCollapsed={isSidebarCollapsed} />
                </div>
                <span>{activeList.name}</span>
              </div>
              <div className="lists-content-actions">
                <ArrowDownUp size={18} style={{ cursor: 'pointer' }} />
                <div style={{ position: 'relative' }}>
                  <MoreHorizontal
                    size={18}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setListMenuOpen(!listMenuOpen); }}
                  />
                  {listMenuOpen && (
                    <div className="lists-dropdown-menu" style={{ right: 0, top: '100%', marginTop: '4px', zIndex: 10, width: '130px' }}>
                      <div className="lists-dropdown-item" onClick={() => { handleAddGroupClick(); setListMenuOpen(false); }}>新建分组</div>
                      <div className="lists-dropdown-item" onClick={() => { handleBatchImport(); setListMenuOpen(false); }}>批量导入MD</div>
                      <div className="lists-dropdown-item" onClick={() => { setBatchExportModalOpen(true); setListMenuOpen(false); }}>批量导出MD</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: '0 32px', display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
              <div
                style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid var(--line-soft)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px' }}
              >
                <Plus size={16} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="添加笔记..."
                  value={newNoteTitle}
                  onChange={e => setNewNoteTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddNote();
                  }}
                  style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px', background: 'transparent' }}
                />
              </div>

              {notes.length === 0 && !isAddingGroup ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-faint)' }}>
                  暂无笔记
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '32px' }}>
                  {isAddingGroup && (
                    <div className="note-group" style={{ marginBottom: '16px' }}>
                      <div className="note-group-header">
                        <input
                          autoFocus
                          type="text"
                          value={newGroupName}
                          onChange={e => setNewGroupName(e.target.value)}
                          placeholder="输入分组名称..."
                          onBlur={handleConfirmAddGroup}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleConfirmAddGroup();
                            if (e.key === 'Escape') setIsAddingGroup(false);
                          }}
                          style={{ fontSize: '14px', fontWeight: 600, border: '1px solid var(--line-soft)', background: '#ffffff', outline: 'none', borderRadius: '4px', padding: '4px 8px', color: 'var(--text-strong)', width: '200px' }}
                        />
                      </div>
                    </div>
                  )}
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
                    {noteGroups.length === 0 && !isAddingGroup ? (
                      <SortableContext items={notes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                        {notes.map(note => (
                          <SortableItem key={note.id} id={note.id}>
                            <NoteItem
                              key={note.id}
                              note={note}
                              allLists={lists}
                              onClick={() => { setActiveNoteId(note.id); setIsDrawerOpen(true); }}
                              onPin={handlePinNote}
                              onDuplicate={handleDuplicateNote}
                              onDelete={handleDeleteNote}
                              onMove={handleMoveNote}
                            />
                          </SortableItem>
                        ))}
                      </SortableContext>
                    ) : (
                      <>
                        {noteGroups.map(group => {
                          const groupNotes = notes.filter(n => n.groupId === group.id);
                          const activeNoteItem = notes.find(n => n.id === activeDragNoteId);
                          const isDragOverTarget = dragOverGroupId === group.id && activeNoteItem && activeNoteItem.groupId !== group.id;
                          return (
                            <NoteGroupView
                              key={group.id}
                              group={group}
                              notes={groupNotes}
                              allLists={lists}
                              isDragOverTarget={!!isDragOverTarget}
                              onRenameGroup={handleRenameGroup}
                              onDeleteGroup={handleDeleteGroup}
                              onNoteClick={(note) => { setActiveNoteId(note.id); setIsDrawerOpen(true); }}
                              onPinNote={handlePinNote}
                              onDuplicateNote={handleDuplicateNote}
                              onDeleteNote={handleDeleteNote}
                              onMoveNote={handleMoveNote}
                            />
                          );
                        })}
                        {notes.filter(n => !n.groupId).length > 0 && (
                          (() => {
                            const activeNoteItem = notes.find(n => n.id === activeDragNoteId);
                            const isDragOverTarget = dragOverGroupId === 'ungrouped' && activeNoteItem && activeNoteItem.groupId !== null;
                            return (
                              <NoteGroupView
                                key="ungrouped"
                                group={{ id: 'ungrouped', listId: activeListId!, name: '未分组' }}
                                notes={notes.filter(n => !n.groupId)}
                                allLists={lists}
                                isUngrouped={true}
                                isDragOverTarget={!!isDragOverTarget}
                                onRenameGroup={() => { }}
                                onDeleteGroup={() => { }}
                                onNoteClick={(note) => { setActiveNoteId(note.id); setIsDrawerOpen(true); }}
                                onPinNote={handlePinNote}
                                onDuplicateNote={handleDuplicateNote}
                                onDeleteNote={handleDeleteNote}
                                onMoveNote={handleMoveNote}
                              />
                            );
                          })()
                        )}
                      </>
                    )}
                  </DndContext>
                </div>
              )}
            </div>

            <NoteDrawer
              note={activeNote}
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              onUpdate={handleNoteUpdate}
              onPin={handlePinNote}
              onDuplicate={handleDuplicateNote}
              onSaveAsTemplate={handleSaveAsTemplate}
              onDelete={handleDeleteNote}
              onOpenTemplate={() => setIsTemplateModalOpen(true)}
              showToast={showToast}
            />
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            请在左侧选择或创建一个清单
          </div>
        )}
      </main>

      {isAddModalOpen && (
        <AddListModal
          folders={folders}
          initialFolderId={addModalInitialFolderId}
          initialData={editListTarget}
          onClose={() => { setIsAddModalOpen(false); setEditListTarget(undefined); }}
          onAdd={handleAddList}
          onAddFolder={handleAddFolder}
        />
      )}

      {isFolderModalOpen && (
        <FolderModal
          initialData={editFolderTarget}
          onClose={() => { setIsFolderModalOpen(false); setEditFolderTarget(undefined); }}
          onSave={handleSaveFolder}
        />
      )}

      {isTemplateModalOpen && (
        <TemplateModal
          templates={templates}
          onSelect={handleSelectTemplate}
          onClose={() => setIsTemplateModalOpen(false)}
          onEdit={handleEditTemplate}
          onDelete={handleDeleteTemplate}
        />
      )}

      {batchExportModalOpen && (
        <BatchExportModal
          notes={notes}
          onExport={handleBatchExport}
          onClose={() => setBatchExportModalOpen(false)}
        />
      )}

      {/* Global Toast Container */}
      <div className="lists-toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`lists-toast-item ${t.type} ${t.isFadingOut ? 'fade-out' : ''}`}>
            {t.type === 'success' ? (
              <CheckCircle size={18} className="lists-toast-icon success" />
            ) : (
              <AlertCircle size={18} className="lists-toast-icon error" />
            )}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MenuIcon({ isCollapsed }: { isCollapsed: boolean }) {
  return isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />;
}
