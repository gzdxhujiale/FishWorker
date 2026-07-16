import { useState, useEffect, useMemo } from 'react';
import { ArrowDownUp, MoreHorizontal, Plus, PanelLeftClose, PanelLeftOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useListsStore } from './listsStore';
import { List, Folder, ViewType, Note, Template } from './listsTypes';
import { ListsSidebar } from './ListsSidebar';
import { AddListModal } from './AddListModal';
import { FolderModal } from './FolderModal';
import { NoteDrawer } from './NoteDrawer';
import { TemplateModal } from './TemplateModal';
import { NoteItem } from './NoteItem';
import { NoteGroupView } from './NoteGroupView';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { invoke } from '@tauri-apps/api/core';
import { BatchExportModal } from './BatchExportModal';
import { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
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

  const templates = store.data.templates;

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
  const [activeNote, setActiveNote] = useState<Note | null>(null);
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
      setActiveNote(null);
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
    if (active.id !== over?.id && over) {
      const activeNoteId = String(active.id);
      const overId = String(over.id);

      let targetGroupId: string | null = null;
      let targetIndex: number | undefined = undefined;

      if (over.data?.current?.type === 'group') {
        targetGroupId = overId === 'ungrouped' ? null : overId;
      } else {
        const overNote = notes.find(n => n.id === overId);
        if (overNote) {
          targetGroupId = overNote.groupId || null;

          const activeNoteData = notes.find(n => n.id === activeNoteId);
          if (activeNoteData && (activeNoteData.groupId || null) === targetGroupId) {
            const siblingNotes = notes.filter(n => (n.groupId || null) === targetGroupId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            const oldIndex = siblingNotes.findIndex(n => n.id === activeNoteId);
            const newIndex = siblingNotes.findIndex(n => n.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) {
              const newSiblingNotes = arrayMove(siblingNotes, oldIndex, newIndex);
              store.reorderNotes(newSiblingNotes.map(n => n.id));
              return;
            }
          }

          const siblingNotes = notes.filter(n => (n.groupId || null) === targetGroupId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          targetIndex = siblingNotes.findIndex(n => n.id === overId);
        }
      }

      const activeNoteData = notes.find(n => n.id === activeNoteId);
      if (activeNoteData) {
        store.moveNoteAndReorder(activeNoteId, targetGroupId, targetIndex);
      }
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
    setActiveNote(newNote);
    setIsDrawerOpen(true);
  };

  const handleBatchImport = async () => {
    if (!activeListId) return;
    try {
      const importedFiles = await invoke<Array<{ title: string; content: string }>>('pick_multiple_markdown_files');
      for (const file of importedFiles) {
        let htmlContent = file.content;
        try {
          const editor = new Editor({
            extensions: [StarterKit, Markdown],
            content: file.content,
          });
          htmlContent = editor.getHTML();
          editor.destroy();
        } catch (e) {
          console.error('Failed to parse markdown:', e);
          if (!htmlContent.trim().startsWith('<')) {
            htmlContent = htmlContent
              .split('\n\n')
              .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
              .join('');
          }
        }
        store.addNote({
          listId: activeListId,
          title: file.title,
          content: htmlContent,
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

    const convertHtmlToMarkdown = (html: string) => {
      let text = html;
      text = text.replace(/<p>/g, '').replace(/<\/p>/g, '\n\n');
      text = text.replace(/<br\s*\/?>/g, '\n');
      text = text.replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n');
      text = text.replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n');
      text = text.replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n');
      text = text.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
      text = text.replace(/<em>(.*?)<\/em>/g, '*$1*');
      text = text.replace(/<code>(.*?)<\/code>/g, '`$1`');
      text = text.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/g, '> $1\n\n');
      text = text.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/g, '```\n$1\n```\n\n');
      text = text.replace(/<[^>]+>/g, '');
      text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      return text.trim();
    };

    const files = notesToExport.map(n => ({
      title: n.title,
      content: convertHtmlToMarkdown(n.content || ''),
    }));

    try {
      await invoke('save_multiple_markdown_files', { files });
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
    if (activeNote?.id === note.id) setActiveNote({ ...activeNote, isPinned: !note.isPinned });
  };

  const handleDuplicateNote = (note: Note) => {
    const newNote = store.addNote({
      listId: note.listId,
      title: note.title + ' (副本)',
      content: note.content,
    });
    setActiveNote(newNote);
    setIsDrawerOpen(true);
  };

  const handleSaveAsTemplate = (note: Note) => {
    store.addTemplate(note.title || '自定义模板', note.content);
    showToast('已保存为模板！');
  };

  const handleDeleteNote = (note: Note) => {
    store.deleteNote(note.id);
    if (activeNote?.id === note.id) {
      setActiveNote(null);
      setIsDrawerOpen(false);
    }
  };

  const ensureHtmlFormat = (text: string) => {
    if (!text) return '';
    if (text.trim().startsWith('<') && text.trim().endsWith('>')) {
      return text;
    }
    return text
      .split('\n')
      .map(line => line.trim() === '' ? '<p></p>' : `<p>${line}</p>`)
      .join('');
  };

  const handleSelectTemplate = (template: Template) => {
    if (!activeNote) return;
    const htmlContent = ensureHtmlFormat(template.content);
    store.updateNote(activeNote.id, { content: htmlContent });
    setIsTemplateModalOpen(false);
    setActiveNote({ ...activeNote, content: htmlContent });
  };

  const handleEditTemplate = (id: string, name: string, content: string) => {
    store.updateTemplate(id, { name, content });
  };

  const handleDeleteTemplate = (id: string) => {
    store.deleteTemplate(id);
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
    if (activeNote?.id === note.id && activeListId !== targetListId) {
      setActiveNote(null);
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
                              onClick={() => { setActiveNote(note); setIsDrawerOpen(true); }}
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
                              onNoteClick={(note) => { setActiveNote(note); setIsDrawerOpen(true); }}
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
                                onNoteClick={(note) => { setActiveNote(note); setIsDrawerOpen(true); }}
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
