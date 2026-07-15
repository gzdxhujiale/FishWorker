import { create } from 'zustand';
import { List, Folder, Note, Template, ListsData, NoteGroup } from './listsTypes';
import { invoke } from '@tauri-apps/api/core';

const STORAGE_KEY = 'aistudy_lists_data';
const MIGRATION_FLAG = 'aistudy_lists_migrated';

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'tpl-1',
    name: '会议纪要',
    content: '<p><strong>主题：</strong></p><p><strong>时间：</strong></p><p><strong>与会人：</strong></p><p></p><p><strong>会议目标：</strong></p><p></p><p><strong>预期成果与关键节点：</strong></p>'
  },
  {
    id: 'tpl-2',
    name: '阅读笔记',
    content: '<p><strong>书名：</strong></p><p><strong>作者：</strong></p><p></p><p><strong>灵感摘要：</strong></p><p></p><p><strong>读后感悟：</strong></p>'
  },
  {
    id: 'tpl-3',
    name: '每周工作总结',
    content: '<p><strong>本周工作目标及完成度：</strong></p><p></p><p><strong>本周最有成就感的事情：</strong></p><p></p><p><strong>本周遇到的工作上的阻碍：</strong></p><p></p><p><strong>总结与反思：</strong></p>'
  }
];

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

interface ListsStoreState {
  data: ListsData;
  initialized: boolean;
  
  // System
  initPromise: Promise<void> | null;
  init: () => Promise<void>;
  
  // Lists
  getLists: () => List[];
  addList: (list: Omit<List, 'id'>) => List;
  updateList: (id: string, updates: Partial<List>) => void;
  deleteList: (id: string) => void;
  duplicateList: (list: List) => List;
  reorderLists: (orderedIds: string[]) => void;
  moveList: (listId: string, folderId: string | null, targetIndex?: number) => void;
  
  // Folders
  getFolders: () => Folder[];
  addFolder: (name: string) => Folder;
  updateFolder: (id: string, updates: Partial<Folder>) => void;
  reorderFolders: (orderedIds: string[]) => void;
  deleteFolder: (id: string) => void;
  
  // Notes
  getNotesByListId: (listId: string) => Note[];
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  moveNoteAndReorder: (noteId: string, groupId: string | null, targetIndex?: number) => void;
  reorderNotes: (orderedIds: string[]) => void;
  
  // Note Groups
  getNoteGroups: (listId: string) => NoteGroup[];
  addGroup: (listId: string, name: string) => NoteGroup;
  updateGroup: (id: string, updates: Partial<NoteGroup>) => void;
  deleteGroup: (id: string) => void;
  
  // Templates
  getTemplates: () => Template[];
  addTemplate: (name: string, content: string) => Template;
  updateTemplate: (id: string, updates: Partial<Template>) => void;
  deleteTemplate: (id: string) => void;
}

const debouncedNoteUpdate = debounce((note: Note) => {
  invoke('list_upsert_note', {
    note: {
      id: note.id,
      listId: note.listId,
      groupId: note.groupId || null,
      title: note.title,
      content: note.content,
      isPinned: note.isPinned || false,
      sortOrder: note.sortOrder || 0,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    }
  }).catch(e => console.error('Failed to sync note update:', e));
}, 500);

export const useListsStore = create<ListsStoreState>((set, get) => ({
  data: {
    lists: [],
    folders: [],
    noteGroups: [],
    notes: [],
    templates: DEFAULT_TEMPLATES,
  },
  initialized: false,
  initPromise: null,

  init: async () => {
    const state = get();
    if (state.initialized) return;
    if (state.initPromise) return state.initPromise;

    const promise = (async () => {
      try {
        const migrated = localStorage.getItem(MIGRATION_FLAG);
        if (!migrated) {
          try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
              localStorage.setItem(MIGRATION_FLAG, '1');
            } else {
              const parsed = JSON.parse(stored) as ListsData;
              if (!parsed.notes) parsed.notes = [];
              if (!parsed.templates) parsed.templates = DEFAULT_TEMPLATES;
              if (!parsed.noteGroups) parsed.noteGroups = [];

              await invoke('list_migrate_from_local', { data: parsed });
              localStorage.setItem(MIGRATION_FLAG, '1');
            }
          } catch (e) {
            console.error('Migration from localStorage failed:', e);
          }
        }

        const allData = await invoke<{
          folders: Array<{ id: string; name: string; isPinned: boolean; sortOrder: number }>;
          lists: Array<{ id: string; name: string; icon: string; color: string; viewType: string; folderId: string | null; isPinned: boolean; sortOrder: number; itemCount: number }>;
          noteGroups: Array<{ id: string; listId: string; name: string; sortOrder: number }>;
          notes: Array<{ id: string; listId: string; groupId: string | null; title: string; content: string; isPinned: boolean; sortOrder: number; createdAt: number; updatedAt: number }>;
          templates: Array<{ id: string; name: string; content: string }>;
        }>('list_load_all');

        let defaultTemplates = allData.templates.length > 0 ? allData.templates : DEFAULT_TEMPLATES;

        if (allData.templates.length === 0) {
          for (const t of DEFAULT_TEMPLATES) {
            await invoke('list_upsert_template', { template: t }).catch(() => {});
          }
        }

        set({
          data: {
            folders: allData.folders.map(f => ({ ...f })),
            lists: allData.lists.map(l => ({ ...l, viewType: l.viewType as 'list' | 'board' })),
            noteGroups: allData.noteGroups.map(g => ({ ...g })),
            notes: allData.notes.map(n => ({ ...n })),
            templates: defaultTemplates,
          },
          initialized: true
        });
      } catch (e) {
        console.error('Failed to load from TiDB, falling back to localStorage:', e);
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (!parsed.notes) parsed.notes = [];
            if (!parsed.templates) parsed.templates = DEFAULT_TEMPLATES;
            if (!parsed.noteGroups) parsed.noteGroups = [];
            set({ data: parsed, initialized: true });
          } else {
            set({ initialized: true });
          }
        } catch (e2) {
          set({ initialized: true });
        }
      }
    })();

    set({ initPromise: promise });
    return promise;
  },

  // ── Lists ──
  getLists: () => {
    return [...get().data.lists].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  },

  addList: (list) => {
    const data = get().data;
    const newList: List = {
      ...list,
      id: genId('list'),
      itemCount: 0,
      sortOrder: data.lists.length
    };
    
    set({ data: { ...data, lists: [...data.lists, newList] } });

    invoke('list_upsert_list', {
      list: {
        id: newList.id,
        name: newList.name,
        icon: newList.icon,
        color: newList.color,
        viewType: newList.viewType,
        folderId: newList.folderId,
        isPinned: newList.isPinned || false,
        sortOrder: newList.sortOrder || 0,
        itemCount: 0,
      }
    }).catch(e => console.error('Failed to sync addList:', e));

    return newList;
  },

  updateList: (id, updates) => {
    const data = get().data;
    const index = data.lists.findIndex(l => l.id === id);
    if (index !== -1) {
      const newLists = [...data.lists];
      newLists[index] = { ...newLists[index], ...updates };
      set({ data: { ...data, lists: newLists } });
      const list = newLists[index];

      invoke('list_upsert_list', {
        list: {
          id: list.id,
          name: list.name,
          icon: list.icon,
          color: list.color,
          viewType: list.viewType,
          folderId: list.folderId,
          isPinned: list.isPinned || false,
          sortOrder: list.sortOrder || 0,
          itemCount: list.itemCount || 0,
        }
      }).catch(e => console.error('Failed to sync updateList:', e));
    }
  },

  deleteList: (id) => {
    const data = get().data;
    set({
      data: {
        ...data,
        lists: data.lists.filter(l => l.id !== id),
        notes: data.notes.filter(n => n.listId !== id),
        noteGroups: data.noteGroups.filter(g => g.listId !== id)
      }
    });

    invoke('list_delete_list', { id }).catch(e => console.error('Failed to sync deleteList:', e));
  },

  duplicateList: (list) => {
    const newList = get().addList({
      ...list,
      name: list.name + ' (副本)',
      isPinned: false
    });

    const groups = get().getNoteGroups(list.id);
    const groupMap = new Map<string, string>();

    groups.forEach(group => {
      const newGroup = get().addGroup(newList.id, group.name);
      get().updateGroup(newGroup.id, { sortOrder: group.sortOrder });
      groupMap.set(group.id, newGroup.id);
    });

    const notes = get().getNotesByListId(list.id);
    notes.forEach(note => {
      get().addNote({
        listId: newList.id,
        groupId: note.groupId ? groupMap.get(note.groupId) || null : null,
        title: note.title,
        content: note.content,
        isPinned: note.isPinned
      });
    });

    invoke('list_duplicate_list', {
      sourceId: list.id,
      newList: {
        id: newList.id,
        name: newList.name,
        icon: newList.icon,
        color: newList.color,
        viewType: newList.viewType,
        folderId: newList.folderId,
        isPinned: newList.isPinned || false,
        sortOrder: newList.sortOrder || 0,
        itemCount: 0,
      }
    }).catch(e => console.error('Failed to sync duplicateList:', e));

    return newList;
  },

  reorderLists: (orderedIds) => {
    const data = get().data;
    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
    const items: Array<[string, number]> = [];
    
    const newLists = data.lists.map(l => {
      if (orderMap.has(l.id)) {
        const order = orderMap.get(l.id)!;
        items.push([l.id, order]);
        return { ...l, sortOrder: order };
      }
      return l;
    });

    set({ data: { ...data, lists: newLists } });
    invoke('list_reorder_lists', { items }).catch(e => console.error('Failed to sync reorderLists:', e));
  },

  moveList: (listId, folderId, targetIndex) => {
    const data = get().data;
    const listIndex = data.lists.findIndex(l => l.id === listId);
    if (listIndex === -1) return;

    const list = { ...data.lists[listIndex], folderId };
    let newLists = [...data.lists];
    newLists[listIndex] = list;

    const siblingLists = newLists
      .filter(l => l.folderId === folderId && l.id !== listId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    if (targetIndex !== undefined) {
      siblingLists.splice(targetIndex, 0, list);
    } else {
      siblingLists.push(list);
    }

    const orderMap = new Map();
    siblingLists.forEach((l, idx) => {
      orderMap.set(l.id, idx);
    });

    newLists = newLists.map(l => {
      if (orderMap.has(l.id)) {
        return { ...l, sortOrder: orderMap.get(l.id) };
      }
      return l;
    });

    set({ data: { ...data, lists: newLists } });
    const updatedList = newLists.find(l => l.id === listId);

    invoke('list_move_list', {
      listId,
      folderId,
      sortOrder: updatedList?.sortOrder || 0
    }).catch(e => console.error('Failed to sync moveList:', e));
  },

  // ── Folders ──
  getFolders: () => {
    return [...get().data.folders].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  },

  addFolder: (name) => {
    const data = get().data;
    const newFolder: Folder = {
      id: genId('folder'),
      name,
      sortOrder: data.folders.length,
    };
    
    set({ data: { ...data, folders: [...data.folders, newFolder] } });

    invoke('list_upsert_folder', {
      folder: {
        id: newFolder.id,
        name: newFolder.name,
        isPinned: false,
        sortOrder: newFolder.sortOrder,
      }
    }).catch(e => console.error('Failed to sync addFolder:', e));

    return newFolder;
  },

  updateFolder: (id, updates) => {
    const data = get().data;
    const index = data.folders.findIndex(f => f.id === id);
    if (index !== -1) {
      const newFolders = [...data.folders];
      newFolders[index] = { ...newFolders[index], ...updates };
      set({ data: { ...data, folders: newFolders } });
      const folder = newFolders[index];

      invoke('list_upsert_folder', {
        folder: {
          id: folder.id,
          name: folder.name,
          isPinned: folder.isPinned || false,
          sortOrder: folder.sortOrder || 0,
        }
      }).catch(e => console.error('Failed to sync updateFolder:', e));
    }
  },

  reorderFolders: (orderedIds) => {
    const data = get().data;
    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
    const items: Array<[string, number]> = [];
    
    const newFolders = data.folders.map(f => {
      if (orderMap.has(f.id)) {
        const order = orderMap.get(f.id)!;
        items.push([f.id, order]);
        return { ...f, sortOrder: order };
      }
      return f;
    });

    set({ data: { ...data, folders: newFolders } });
    invoke('list_reorder_folders', { items }).catch(e => console.error('Failed to sync reorderFolders:', e));
  },

  deleteFolder: (id) => {
    const data = get().data;
    set({
      data: {
        ...data,
        folders: data.folders.filter(f => f.id !== id),
        lists: data.lists.map(l => (l.folderId === id ? { ...l, folderId: null } : l))
      }
    });

    invoke('list_delete_folder', { id }).catch(e => console.error('Failed to sync deleteFolder:', e));
  },

  // ── Notes ──
  getNotesByListId: (listId) => {
    return get().data.notes
      .filter(n => n.listId === listId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.sortOrder !== b.sortOrder) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }
        return b.updatedAt - a.updatedAt;
      });
  },

  addNote: (note) => {
    const data = get().data;
    const siblingNotes = data.notes.filter(n => n.listId === note.listId && n.groupId === note.groupId);
    const newNote: Note = {
      ...note,
      id: genId('note'),
      sortOrder: siblingNotes.length,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    let newLists = [...data.lists];
    const listIndex = newLists.findIndex(l => l.id === note.listId);
    if (listIndex !== -1) {
      newLists[listIndex] = { ...newLists[listIndex], itemCount: (newLists[listIndex].itemCount || 0) + 1 };
    }

    set({ data: { ...data, notes: [...data.notes, newNote], lists: newLists } });

    invoke('list_upsert_note', {
      note: {
        id: newNote.id,
        listId: newNote.listId,
        groupId: newNote.groupId || null,
        title: newNote.title,
        content: newNote.content,
        isPinned: newNote.isPinned || false,
        sortOrder: newNote.sortOrder || 0,
        createdAt: newNote.createdAt,
        updatedAt: newNote.updatedAt,
      }
    }).catch(e => console.error('Failed to sync addNote:', e));

    return newNote;
  },

  updateNote: (id, updates) => {
    const data = get().data;
    const index = data.notes.findIndex(n => n.id === id);
    if (index !== -1) {
      const newNotes = [...data.notes];
      newNotes[index] = { ...newNotes[index], ...updates, updatedAt: Date.now() };
      set({ data: { ...data, notes: newNotes } });
      debouncedNoteUpdate(newNotes[index]);
    }
  },

  deleteNote: (id) => {
    const data = get().data;
    const note = data.notes.find(n => n.id === id);
    if (note) {
      let newLists = [...data.lists];
      const listIndex = newLists.findIndex(l => l.id === note.listId);
      if (listIndex !== -1 && (newLists[listIndex].itemCount || 0) > 0) {
        newLists[listIndex] = { ...newLists[listIndex], itemCount: newLists[listIndex].itemCount! - 1 };
      }

      set({
        data: {
          ...data,
          notes: data.notes.filter(n => n.id !== id),
          lists: newLists
        }
      });

      invoke('list_delete_note', { id }).catch(e => console.error('Failed to sync deleteNote:', e));
    }
  },

  moveNoteAndReorder: (noteId, groupId, targetIndex) => {
    const data = get().data;
    const noteIndex = data.notes.findIndex(n => n.id === noteId);
    if (noteIndex === -1) return;

    let newNotes = [...data.notes];
    const note = { ...newNotes[noteIndex], groupId };
    newNotes[noteIndex] = note;

    const siblingNotes = newNotes
      .filter(n => n.listId === note.listId && n.groupId === groupId && n.id !== noteId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.sortOrder !== b.sortOrder) return (a.sortOrder || 0) - (b.sortOrder || 0);
        return b.updatedAt - a.updatedAt;
      });

    if (targetIndex !== undefined) {
      siblingNotes.splice(targetIndex, 0, note);
    } else {
      siblingNotes.push(note);
    }

    const orderMap = new Map();
    siblingNotes.forEach((n, idx) => {
      orderMap.set(n.id, idx);
    });

    newNotes = newNotes.map(n => {
      if (orderMap.has(n.id)) {
        return { ...n, sortOrder: orderMap.get(n.id) };
      }
      return n;
    });

    set({ data: { ...data, notes: newNotes } });
    const updatedNote = newNotes.find(n => n.id === noteId);

    invoke('list_move_note', {
      noteId,
      listId: note.listId,
      groupId,
      sortOrder: updatedNote?.sortOrder || 0,
    }).catch(e => console.error('Failed to sync moveNote:', e));
  },

  reorderNotes: (orderedIds) => {
    const data = get().data;
    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
    const items: Array<[string, number]> = [];
    
    const newNotes = data.notes.map(n => {
      if (orderMap.has(n.id)) {
        const order = orderMap.get(n.id)!;
        items.push([n.id, order]);
        return { ...n, sortOrder: order };
      }
      return n;
    });

    set({ data: { ...data, notes: newNotes } });
    invoke('list_reorder_notes', { items }).catch(e => console.error('Failed to sync reorderNotes:', e));
  },

  // ── Note Groups ──
  getNoteGroups: (listId) => {
    return get().data.noteGroups
      .filter(g => g.listId === listId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  },

  addGroup: (listId, name) => {
    const data = get().data;
    const newGroup: NoteGroup = {
      id: genId('group'),
      listId,
      name,
      sortOrder: data.noteGroups.filter(g => g.listId === listId).length
    };
    
    set({ data: { ...data, noteGroups: [...data.noteGroups, newGroup] } });

    invoke('list_upsert_group', {
      group: {
        id: newGroup.id,
        listId: newGroup.listId,
        name: newGroup.name,
        sortOrder: newGroup.sortOrder || 0,
      }
    }).catch(e => console.error('Failed to sync addGroup:', e));

    return newGroup;
  },

  updateGroup: (id, updates) => {
    const data = get().data;
    const index = data.noteGroups.findIndex(g => g.id === id);
    if (index !== -1) {
      const newGroups = [...data.noteGroups];
      newGroups[index] = { ...newGroups[index], ...updates };
      set({ data: { ...data, noteGroups: newGroups } });
      const group = newGroups[index];

      invoke('list_upsert_group', {
        group: {
          id: group.id,
          listId: group.listId,
          name: group.name,
          sortOrder: group.sortOrder || 0,
        }
      }).catch(e => console.error('Failed to sync updateGroup:', e));
    }
  },

  deleteGroup: (id) => {
    const data = get().data;
    set({
      data: {
        ...data,
        noteGroups: data.noteGroups.filter(g => g.id !== id),
        notes: data.notes.map(n => (n.groupId === id ? { ...n, groupId: null } : n))
      }
    });

    invoke('list_delete_group', { id }).catch(e => console.error('Failed to sync deleteGroup:', e));
  },

  // ── Templates ──
  getTemplates: () => {
    return get().data.templates;
  },

  addTemplate: (name, content) => {
    const data = get().data;
    const newTemplate: Template = {
      id: genId('tpl'),
      name,
      content
    };
    
    set({ data: { ...data, templates: [...data.templates, newTemplate] } });

    invoke('list_upsert_template', { template: newTemplate })
      .catch(e => console.error('Failed to sync addTemplate:', e));

    return newTemplate;
  },

  updateTemplate: (id, updates) => {
    const data = get().data;
    const index = data.templates.findIndex(t => t.id === id);
    if (index !== -1) {
      const newTemplates = [...data.templates];
      newTemplates[index] = { ...newTemplates[index], ...updates };
      set({ data: { ...data, templates: newTemplates } });
      
      invoke('list_upsert_template', { template: newTemplates[index] })
        .catch(e => console.error('Failed to sync updateTemplate:', e));
    }
  },

  deleteTemplate: (id) => {
    const data = get().data;
    set({
      data: {
        ...data,
        templates: data.templates.filter(t => t.id !== id)
      }
    });

    invoke('list_delete_template', { id })
      .catch(e => console.error('Failed to sync deleteTemplate:', e));
  }
}));
