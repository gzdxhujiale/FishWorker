import { useState, useEffect } from 'react';
import { ArrowDownUp, MoreHorizontal, Plus, FileText } from 'lucide-react';
import { listsStore } from './listsStore';
import { List, Folder, ViewType, Note, Template, NoteGroup } from './listsTypes';
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
import './lists.css';

export function ListsPanel() {
  const [lists, setLists] = useState<List[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialFolderId, setAddModalInitialFolderId] = useState<string | undefined>();
  const [editListTarget, setEditListTarget] = useState<List | undefined>();
  
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editFolderTarget, setEditFolderTarget] = useState<Folder | undefined>();
  
  // Note state
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteGroups, setNoteGroups] = useState<NoteGroup[]>([]);
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
  const [templates, setTemplates] = useState<Template[]>([]);

  const refreshData = () => {
    setLists(listsStore.getLists());
    setFolders(listsStore.getFolders());
    setTemplates(listsStore.getTemplates());
    if (activeListId) {
      setNotes(listsStore.getNotesByListId(activeListId));
      setNoteGroups(listsStore.getNoteGroups(activeListId));
    }
  };

  useEffect(() => {
    const loadedLists = listsStore.getLists();
    setLists(loadedLists);
    setFolders(listsStore.getFolders());
    setTemplates(listsStore.getTemplates());
    
    if (loadedLists.length > 0 && !activeListId) {
      setActiveListId(loadedLists[0].id);
      setNotes(listsStore.getNotesByListId(loadedLists[0].id));
      setNoteGroups(listsStore.getNoteGroups(loadedLists[0].id));
    }
  }, []);

  useEffect(() => {
    if (activeListId) {
      setNotes(listsStore.getNotesByListId(activeListId));
      setNoteGroups(listsStore.getNoteGroups(activeListId));
      setActiveNote(null);
      setIsDrawerOpen(false);
    } else {
      setNotes([]);
      setNoteGroups([]);
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

      // Check if dropped on a group container directly
      if (over.data?.current?.type === 'group') {
        targetGroupId = overId === 'ungrouped' ? null : overId;
      } else {
        // Dropped on a note
        const overNote = notes.find(n => n.id === overId);
        if (overNote) {
          targetGroupId = overNote.groupId || null;
          
          const activeNoteData = notes.find(n => n.id === activeNoteId);
          if (activeNoteData && (activeNoteData.groupId || null) === targetGroupId) {
            // Same group reordering
            const siblingNotes = notes.filter(n => (n.groupId || null) === targetGroupId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            const oldIndex = siblingNotes.findIndex(n => n.id === activeNoteId);
            const newIndex = siblingNotes.findIndex(n => n.id === overId);
            if (oldIndex !== -1 && newIndex !== -1) {
              const newSiblingNotes = arrayMove(siblingNotes, oldIndex, newIndex);
              listsStore.reorderNotes(newSiblingNotes.map(n => n.id));
              refreshData();
              return;
            }
          }
          
          const siblingNotes = notes.filter(n => (n.groupId || null) === targetGroupId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          targetIndex = siblingNotes.findIndex(n => n.id === overId);
        }
      }

      const activeNoteData = notes.find(n => n.id === activeNoteId);
      if (activeNoteData) {
        listsStore.moveNoteAndReorder(activeNoteId, targetGroupId, targetIndex);
        refreshData();
      }
    }
  };

  // --- List Handlers ---
  const handleAddListClick = (folderId?: string) => {
    setEditListTarget(undefined);
    setAddModalInitialFolderId(folderId);
    setIsAddModalOpen(true);
  };

  const handleAddList = (data: { name: string; color: string; viewType: ViewType; folderId: string | null; icon: string }, newFolderName?: string) => {
    let finalFolderId = data.folderId;
    if (newFolderName) {
      const newFolder = listsStore.addFolder(newFolderName);
      finalFolderId = newFolder.id;
    }
    if (editListTarget) {
      listsStore.updateList(editListTarget.id, {
        name: data.name,
        color: data.color,
        viewType: data.viewType,
        folderId: finalFolderId,
        icon: data.icon,
      });
    } else {
      const newList = listsStore.addList({
        name: data.name,
        color: data.color,
        viewType: data.viewType,
        folderId: finalFolderId,
        icon: data.icon,
      });
      setActiveListId(newList.id);
    }
    refreshData();
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
      listsStore.updateFolder(editFolderTarget.id, { name });
    }
    refreshData();
    setIsFolderModalOpen(false);
    setEditFolderTarget(undefined);
  };

  const handlePinFolder = (folder: Folder) => {
    listsStore.updateFolder(folder.id, { isPinned: !folder.isPinned });
    refreshData();
  };

  const handleEditList = (list: List) => {
    setEditListTarget(list);
    setIsAddModalOpen(true);
  };

  const handlePinList = (list: List) => {
    listsStore.updateList(list.id, { isPinned: !list.isPinned });
    refreshData();
  };

  const handleDuplicateList = (list: List) => {
    const newList = listsStore.duplicateList(list);
    refreshData();
    setActiveListId(newList.id);
  };

  const handleDeleteList = (list: List) => {
    listsStore.deleteList(list.id);
    if (activeListId === list.id) setActiveListId(null);
    refreshData();
  };

  // --- Note Actions ---
  const handleAddNote = () => {
    if (!activeListId || !newNoteTitle.trim()) return;
    const newNote = listsStore.addNote({
      listId: activeListId,
      title: newNoteTitle.trim(),
      content: '',
    });
    setNewNoteTitle('');
    refreshData();
    setActiveNote(newNote);
    setIsDrawerOpen(true);
  };

  const handleNoteUpdate = (id: string, title: string, content: string) => {
    listsStore.updateNote(id, { title, content });
    if (activeListId) setNotes(listsStore.getNotesByListId(activeListId));
  };

  const handlePinNote = (note: Note) => {
    listsStore.updateNote(note.id, { isPinned: !note.isPinned });
    if (activeListId) setNotes(listsStore.getNotesByListId(activeListId));
    if (activeNote?.id === note.id) setActiveNote({ ...activeNote, isPinned: !activeNote.isPinned });
  };

  const handleDuplicateNote = (note: Note) => {
    const newNote = listsStore.addNote({
      listId: note.listId,
      title: note.title + ' (副本)',
      content: note.content,
    });
    refreshData();
    setActiveNote(newNote);
    setIsDrawerOpen(true);
  };

  const handleSaveAsTemplate = (note: Note) => {
    listsStore.addTemplate(note.title || '自定义模板', note.content);
    refreshData();
    alert('已保存为模板！');
  };

  const handleDeleteNote = (note: Note) => {
    listsStore.deleteNote(note.id);
    refreshData();
    if (activeNote?.id === note.id) {
      setActiveNote(null);
      setIsDrawerOpen(false);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    if (!activeNote) return;
    listsStore.updateNote(activeNote.id, { content: template.content });
    refreshData();
    setIsTemplateModalOpen(false);
    setActiveNote({ ...activeNote, content: template.content });
  };

  const handleEditTemplate = (id: string, name: string, content: string) => {
    listsStore.updateTemplate(id, { name, content });
    refreshData();
  };

  const handleDeleteTemplate = (id: string) => {
    listsStore.deleteTemplate(id);
    refreshData();
  };

  // --- Group Actions ---
  const handleAddGroupClick = () => {
    setIsAddingGroup(true);
    setNewGroupName('');
  };

  const handleConfirmAddGroup = () => {
    if (!activeListId) return;
    if (newGroupName.trim()) {
      listsStore.addGroup(activeListId, newGroupName.trim());
      refreshData();
    }
    setIsAddingGroup(false);
  };

  const handleRenameGroup = (id: string, name: string) => {
    listsStore.updateGroup(id, { name });
    refreshData();
  };

  const handleDeleteGroup = (id: string) => {
    listsStore.deleteGroup(id);
    refreshData();
  };

  const handleMoveNote = (note: Note, targetListId: string) => {
    listsStore.updateNote(note.id, { listId: targetListId, groupId: null });
    refreshData();
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
        onEditList={handleEditList}
        onPinList={handlePinList}
        onDuplicateList={handleDuplicateList}
        onDeleteList={handleDeleteList}
        onDataChange={refreshData}
      />
      
      <main className="lists-main-content" onClick={() => setListMenuOpen(false)}>
        {activeList ? (
          <>
            <div className="lists-content-header">
              <div className="lists-content-title">
                <MenuIcon />
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
                    <div className="lists-dropdown-menu" style={{ right: 0, top: '100%', marginTop: '4px', zIndex: 10 }}>
                       <div className="lists-dropdown-item" onClick={() => { handleAddGroupClick(); setListMenuOpen(false); }}>新建分组</div>
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
                    // Flat list if no groups
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
                    // Grouped view
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
                      {/* Ungrouped notes */}
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
                              onRenameGroup={() => {}}
                              onDeleteGroup={() => {}}
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
    </section>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6"></line>
      <line x1="4" y1="12" x2="20" y2="12"></line>
      <line x1="4" y1="18" x2="20" y2="18"></line>
      <path d="M12 4l-8 8 8 8" opacity="0.3"></path>
    </svg>
  );
}
