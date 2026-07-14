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

// ── Debounce utility ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}

// ── ID generator (matching old format) ──

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ── Store class ──

class ListsStore {
  private data: ListsData;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  // Debounced IPC calls for note editing
  private debouncedNoteUpdate = debounce((note: Note) => {
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

  constructor() {
    this.data = {
      lists: [],
      folders: [],
      noteGroups: [],
      notes: [],
      templates: DEFAULT_TEMPLATES,
    };
  }

  // ── Initialization ──

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    try {
      // Check if we need to migrate from localStorage
      const migrated = localStorage.getItem(MIGRATION_FLAG);
      if (!migrated) {
        await this.migrateFromLocalStorage();
      }

      // Load from TiDB
      const allData = await invoke<{
        folders: Array<{ id: string; name: string; isPinned: boolean; sortOrder: number }>;
        lists: Array<{ id: string; name: string; icon: string; color: string; viewType: string; folderId: string | null; isPinned: boolean; sortOrder: number; itemCount: number }>;
        noteGroups: Array<{ id: string; listId: string; name: string; sortOrder: number }>;
        notes: Array<{ id: string; listId: string; groupId: string | null; title: string; content: string; isPinned: boolean; sortOrder: number; createdAt: number; updatedAt: number }>;
        templates: Array<{ id: string; name: string; content: string }>;
      }>('list_load_all');

      this.data.folders = allData.folders.map(f => ({
        id: f.id,
        name: f.name,
        isPinned: f.isPinned,
      }));

      this.data.lists = allData.lists.map(l => ({
        id: l.id,
        name: l.name,
        icon: l.icon,
        color: l.color,
        viewType: l.viewType as 'list' | 'board',
        folderId: l.folderId,
        isPinned: l.isPinned,
        sortOrder: l.sortOrder,
        itemCount: l.itemCount,
      }));

      this.data.noteGroups = allData.noteGroups.map(g => ({
        id: g.id,
        listId: g.listId,
        name: g.name,
        sortOrder: g.sortOrder,
      }));

      this.data.notes = allData.notes.map(n => ({
        id: n.id,
        listId: n.listId,
        groupId: n.groupId,
        title: n.title,
        content: n.content,
        isPinned: n.isPinned,
        sortOrder: n.sortOrder,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }));

      this.data.templates = allData.templates.length > 0 ? allData.templates : DEFAULT_TEMPLATES;

      // Seed default templates if DB has none
      if (allData.templates.length === 0) {
        for (const t of DEFAULT_TEMPLATES) {
          await invoke('list_upsert_template', { template: t }).catch(() => {});
        }
      }

      this.initialized = true;
    } catch (e) {
      console.error('Failed to load from TiDB, falling back to localStorage:', e);
      this.loadFromLocalStorage();
      this.initialized = true;
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed.notes) parsed.notes = [];
        if (!parsed.templates) parsed.templates = DEFAULT_TEMPLATES;
        if (!parsed.noteGroups) parsed.noteGroups = [];
        this.data = parsed;
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
  }

  private async migrateFromLocalStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(MIGRATION_FLAG, '1');
        return;
      }

      const parsed = JSON.parse(stored) as ListsData;
      if (!parsed.notes) parsed.notes = [];
      if (!parsed.templates) parsed.templates = DEFAULT_TEMPLATES;
      if (!parsed.noteGroups) parsed.noteGroups = [];

      await invoke('list_migrate_from_local', { data: parsed });
      localStorage.setItem(MIGRATION_FLAG, '1');
      console.log('Successfully migrated list data from localStorage to TiDB');
    } catch (e) {
      console.error('Migration from localStorage failed:', e);
      // Don't set flag so it retries next time
    }
  }

  // ── Lists ──

  getLists(): List[] {
    return [...this.data.lists].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }

  addList(list: Omit<List, 'id'>): List {
    const newList: List = {
      ...list,
      id: genId('list'),
      itemCount: 0,
      sortOrder: this.data.lists.length
    };
    this.data.lists.push(newList);

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
  }

  updateList(id: string, updates: Partial<List>): void {
    const list = this.data.lists.find(l => l.id === id);
    if (list) {
      Object.assign(list, updates);

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
  }

  deleteList(id: string): void {
    this.data.lists = this.data.lists.filter(l => l.id !== id);
    this.data.notes = this.data.notes.filter(n => n.listId !== id);
    this.data.noteGroups = this.data.noteGroups.filter(g => g.listId !== id);

    invoke('list_delete_list', { id }).catch(e => console.error('Failed to sync deleteList:', e));
  }

  duplicateList(list: List): List {
    const newList = this.addList({
      ...list,
      name: list.name + ' (副本)',
      isPinned: false
    });

    // Copy groups
    const groups = this.getNoteGroups(list.id);
    const groupMap = new Map<string, string>();

    groups.forEach(group => {
      const newGroup = this.addGroup(newList.id, group.name);
      newGroup.sortOrder = group.sortOrder;
      groupMap.set(group.id, newGroup.id);
    });

    // Copy notes
    const notes = this.getNotesByListId(list.id);
    notes.forEach(note => {
      this.addNote({
        listId: newList.id,
        groupId: note.groupId ? groupMap.get(note.groupId) || null : null,
        title: note.title,
        content: note.content,
        isPinned: note.isPinned
      });
    });

    // Also sync the complete duplication to backend
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
  }

  reorderLists(orderedIds: string[]): void {
    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
    const items: Array<[string, number]> = [];
    this.data.lists.forEach(l => {
      if (orderMap.has(l.id)) {
        l.sortOrder = orderMap.get(l.id);
        items.push([l.id, l.sortOrder!]);
      }
    });

    invoke('list_reorder_lists', { items }).catch(e => console.error('Failed to sync reorderLists:', e));
  }

  moveList(listId: string, folderId: string | null, targetIndex?: number): void {
    const list = this.data.lists.find(l => l.id === listId);
    if (!list) return;

    list.folderId = folderId;
    const siblingLists = this.data.lists
      .filter(l => l.folderId === folderId && l.id !== listId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    if (targetIndex !== undefined) {
      siblingLists.splice(targetIndex, 0, list);
    } else {
      siblingLists.push(list);
    }

    siblingLists.forEach((l, idx) => {
      l.sortOrder = idx;
    });

    invoke('list_move_list', {
      listId,
      folderId,
      sortOrder: list.sortOrder || 0
    }).catch(e => console.error('Failed to sync moveList:', e));
  }

  // ── Folders ──

  getFolders(): Folder[] {
    return [...this.data.folders].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }

  addFolder(name: string): Folder {
    const newFolder: Folder = {
      id: genId('folder'),
      name,
    };
    this.data.folders.push(newFolder);

    invoke('list_upsert_folder', {
      folder: {
        id: newFolder.id,
        name: newFolder.name,
        isPinned: false,
        sortOrder: this.data.folders.length - 1,
      }
    }).catch(e => console.error('Failed to sync addFolder:', e));

    return newFolder;
  }

  updateFolder(id: string, updates: Partial<Folder>): void {
    const folder = this.data.folders.find(f => f.id === id);
    if (folder) {
      Object.assign(folder, updates);

      invoke('list_upsert_folder', {
        folder: {
          id: folder.id,
          name: folder.name,
          isPinned: folder.isPinned || false,
          sortOrder: 0,
        }
      }).catch(e => console.error('Failed to sync updateFolder:', e));
    }
  }

  deleteFolder(id: string): void {
    this.data.folders = this.data.folders.filter(f => f.id !== id);
    this.data.lists.forEach(l => {
      if (l.folderId === id) {
        l.folderId = null;
      }
    });

    invoke('list_delete_folder', { id }).catch(e => console.error('Failed to sync deleteFolder:', e));
  }

  // ── Notes ──

  getNotesByListId(listId: string): Note[] {
    return this.data.notes
      .filter(n => n.listId === listId)
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.sortOrder !== b.sortOrder) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }
        return b.updatedAt - a.updatedAt;
      });
  }

  addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'>): Note {
    const siblingNotes = this.data.notes.filter(n => n.listId === note.listId && n.groupId === note.groupId);
    const newNote: Note = {
      ...note,
      id: genId('note'),
      sortOrder: siblingNotes.length,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.data.notes.push(newNote);

    // Update list item count
    const list = this.data.lists.find(l => l.id === note.listId);
    if (list) {
      list.itemCount = (list.itemCount || 0) + 1;
    }

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
  }

  updateNote(id: string, updates: Partial<Note>): void {
    const note = this.data.notes.find(n => n.id === id);
    if (note) {
      Object.assign(note, updates);
      note.updatedAt = Date.now();

      // Use debounce for content/title updates (high frequency)
      this.debouncedNoteUpdate(note);
    }
  }

  deleteNote(id: string): void {
    const note = this.data.notes.find(n => n.id === id);
    if (note) {
      this.data.notes = this.data.notes.filter(n => n.id !== id);
      const list = this.data.lists.find(l => l.id === note.listId);
      if (list && list.itemCount && list.itemCount > 0) {
        list.itemCount -= 1;
      }

      invoke('list_delete_note', { id }).catch(e => console.error('Failed to sync deleteNote:', e));
    }
  }

  moveNoteAndReorder(noteId: string, groupId: string | null, targetIndex?: number): void {
    const note = this.data.notes.find(n => n.id === noteId);
    if (!note) return;

    note.groupId = groupId;
    const siblingNotes = this.data.notes
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

    siblingNotes.forEach((n, idx) => {
      n.sortOrder = idx;
    });

    invoke('list_move_note', {
      noteId,
      listId: note.listId,
      groupId,
      sortOrder: note.sortOrder || 0,
    }).catch(e => console.error('Failed to sync moveNote:', e));
  }

  reorderNotes(orderedIds: string[]): void {
    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
    const items: Array<[string, number]> = [];
    this.data.notes.forEach(n => {
      if (orderMap.has(n.id)) {
        n.sortOrder = orderMap.get(n.id);
        items.push([n.id, n.sortOrder!]);
      }
    });

    invoke('list_reorder_notes', { items }).catch(e => console.error('Failed to sync reorderNotes:', e));
  }

  // ── Note Groups ──

  getNoteGroups(listId: string): NoteGroup[] {
    return this.data.noteGroups
      .filter(g => g.listId === listId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  addGroup(listId: string, name: string): NoteGroup {
    const newGroup: NoteGroup = {
      id: genId('group'),
      listId,
      name,
      sortOrder: this.data.noteGroups.filter(g => g.listId === listId).length
    };
    this.data.noteGroups.push(newGroup);

    invoke('list_upsert_group', {
      group: {
        id: newGroup.id,
        listId: newGroup.listId,
        name: newGroup.name,
        sortOrder: newGroup.sortOrder || 0,
      }
    }).catch(e => console.error('Failed to sync addGroup:', e));

    return newGroup;
  }

  updateGroup(id: string, updates: Partial<NoteGroup>): void {
    const group = this.data.noteGroups.find(g => g.id === id);
    if (group) {
      Object.assign(group, updates);

      invoke('list_upsert_group', {
        group: {
          id: group.id,
          listId: group.listId,
          name: group.name,
          sortOrder: group.sortOrder || 0,
        }
      }).catch(e => console.error('Failed to sync updateGroup:', e));
    }
  }

  deleteGroup(id: string): void {
    this.data.noteGroups = this.data.noteGroups.filter(g => g.id !== id);
    this.data.notes.forEach(n => {
      if (n.groupId === id) {
        n.groupId = null;
      }
    });

    invoke('list_delete_group', { id }).catch(e => console.error('Failed to sync deleteGroup:', e));
  }

  // ── Templates ──

  getTemplates(): Template[] {
    return this.data.templates;
  }

  addTemplate(name: string, content: string): Template {
    const newTemplate: Template = {
      id: genId('tpl'),
      name,
      content
    };
    this.data.templates.push(newTemplate);

    invoke('list_upsert_template', { template: newTemplate })
      .catch(e => console.error('Failed to sync addTemplate:', e));

    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<Template>): void {
    const tpl = this.data.templates.find(t => t.id === id);
    if (tpl) {
      Object.assign(tpl, updates);

      invoke('list_upsert_template', { template: tpl })
        .catch(e => console.error('Failed to sync updateTemplate:', e));
    }
  }

  deleteTemplate(id: string): void {
    this.data.templates = this.data.templates.filter(t => t.id !== id);

    invoke('list_delete_template', { id })
      .catch(e => console.error('Failed to sync deleteTemplate:', e));
  }
}

export const listsStore = new ListsStore();
