import { List, Folder, Note, Template, ListsData } from './listsTypes';

const STORAGE_KEY = 'aistudy_lists_data';

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'tpl-1',
    name: '会议纪要',
    content: '主题：\n时间：\n与会人：\n\n会议目标：\n\n预期成果与关键节点：\n'
  },
  {
    id: 'tpl-2',
    name: '阅读笔记',
    content: '书名：\n作者：\n\n灵感摘要：\n\n读后感悟：\n'
  },
  {
    id: 'tpl-3',
    name: '每周工作总结',
    content: '本周工作目标及完成度：\n\n本周最有成就感的事情：\n\n本周遇到的工作上的阻碍：\n\n总结与反思：\n'
  }
];

const DEFAULT_DATA: ListsData = {
  lists: [
    {
      id: 'list-1',
      name: '学习笔记',
      icon: 'BookOpen',
      color: '#000000',
      viewType: 'list',
      folderId: 'folder-1',
      itemCount: 1,
    },
    {
      id: 'list-2',
      name: '工作任务',
      icon: 'Briefcase',
      color: '#795548',
      viewType: 'list',
      folderId: null,
      itemCount: 1,
    },
    {
      id: 'list-3',
      name: '个人备忘',
      icon: 'Home',
      color: '#FF5722',
      viewType: 'list',
      folderId: null,
      itemCount: 0,
    }
  ],
  folders: [
    { id: 'folder-1', name: '第一个文件夹' }
  ],
  noteGroups: [],
  notes: [
    {
      id: 'note-1',
      listId: 'list-1',
      groupId: null,
      sortOrder: 0,
      title: '我',
      content: '这是一条示例笔记。',
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ],
  templates: DEFAULT_TEMPLATES
};

class ListsStore {
  private data: ListsData;

  constructor() {
    this.data = this.load();
  }

  load(): ListsData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure notes and templates exist (for migration)
        if (!parsed.notes) parsed.notes = [];
        if (!parsed.templates) parsed.templates = DEFAULT_TEMPLATES;
        if (!parsed.noteGroups) parsed.noteGroups = [];
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load lists data from local storage', e);
    }
    return DEFAULT_DATA;
  }

  save(data: ListsData): void {
    this.data = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save lists data to local storage', e);
    }
  }

  // --- Lists ---
  getLists(): List[] {
    // Return pinned lists first, then by sortOrder
    return [...this.data.lists].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });
  }

  addList(list: Omit<List, 'id'>): List {
    const newList: List = {
      ...list,
      id: `list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      itemCount: 0,
      sortOrder: this.data.lists.length
    };
    this.data.lists.push(newList);
    this.save(this.data);
    return newList;
  }

  updateList(id: string, updates: Partial<List>): void {
    const list = this.data.lists.find(l => l.id === id);
    if (list) {
      Object.assign(list, updates);
      this.save(this.data);
    }
  }

  deleteList(id: string): void {
    this.data.lists = this.data.lists.filter(l => l.id !== id);
    // Cascade delete notes
    this.data.notes = this.data.notes.filter(n => n.listId !== id);
    // Cascade delete groups
    this.data.noteGroups = this.data.noteGroups.filter(g => g.listId !== id);
    this.save(this.data);
  }

  duplicateList(list: List): List {
    const newList = this.addList({
      ...list,
      name: list.name + ' (副本)',
      isPinned: false // Don't copy pinned state by default
    });
    
    // Copy groups
    const groups = this.getNoteGroups(list.id);
    const groupMap = new Map<string, string>(); // oldGroupId -> newGroupId
    
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
    
    this.save(this.data);
    return newList;
  }

  reorderLists(orderedIds: string[]): void {
    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
    this.data.lists.forEach(l => {
      if (orderMap.has(l.id)) {
        l.sortOrder = orderMap.get(l.id);
      }
    });
    this.save(this.data);
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

    this.save(this.data);
  }

  // --- Folders ---
  getFolders(): Folder[] {
    return [...this.data.folders].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });
  }

  addFolder(name: string): Folder {
    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
    };
    this.data.folders.push(newFolder);
    this.save(this.data);
    return newFolder;
  }

  updateFolder(id: string, updates: Partial<Folder>): void {
    const folder = this.data.folders.find(f => f.id === id);
    if (folder) {
      Object.assign(folder, updates);
      this.save(this.data);
    }
  }

  deleteFolder(id: string): void {
    this.data.folders = this.data.folders.filter(f => f.id !== id);
    // Unlink lists
    this.data.lists.forEach(l => {
      if (l.folderId === id) {
        l.folderId = null;
      }
    });
    this.save(this.data);
  }

  // --- Notes ---
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
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
    
    this.save(this.data);
    return newNote;
  }

  updateNote(id: string, updates: Partial<Note>): void {
    const note = this.data.notes.find(n => n.id === id);
    if (note) {
      Object.assign(note, updates);
      note.updatedAt = Date.now();
      this.save(this.data);
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
      this.save(this.data);
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

    this.save(this.data);
  }

  reorderNotes(orderedIds: string[]): void {
    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
    this.data.notes.forEach(n => {
      if (orderMap.has(n.id)) {
        n.sortOrder = orderMap.get(n.id);
      }
    });
    this.save(this.data);
  }

  // --- Note Groups ---
  getNoteGroups(listId: string): import('./listsTypes').NoteGroup[] {
    return this.data.noteGroups
      .filter(g => g.listId === listId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  addGroup(listId: string, name: string): import('./listsTypes').NoteGroup {
    const newGroup: import('./listsTypes').NoteGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      listId,
      name,
      sortOrder: this.data.noteGroups.filter(g => g.listId === listId).length
    };
    this.data.noteGroups.push(newGroup);
    this.save(this.data);
    return newGroup;
  }

  updateGroup(id: string, updates: Partial<import('./listsTypes').NoteGroup>): void {
    const group = this.data.noteGroups.find(g => g.id === id);
    if (group) {
      Object.assign(group, updates);
      this.save(this.data);
    }
  }

  deleteGroup(id: string): void {
    this.data.noteGroups = this.data.noteGroups.filter(g => g.id !== id);
    // Move notes to ungrouped
    this.data.notes.forEach(n => {
      if (n.groupId === id) {
        n.groupId = null;
      }
    });
    this.save(this.data);
  }

  // --- Templates ---
  getTemplates(): Template[] {
    return this.data.templates;
  }

  addTemplate(name: string, content: string): Template {
    const newTemplate: Template = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      content
    };
    this.data.templates.push(newTemplate);
    this.save(this.data);
    return newTemplate;
  }

  updateTemplate(id: string, updates: Partial<Template>): void {
    const tpl = this.data.templates.find(t => t.id === id);
    if (tpl) {
      Object.assign(tpl, updates);
      this.save(this.data);
    }
  }

  deleteTemplate(id: string): void {
    this.data.templates = this.data.templates.filter(t => t.id !== id);
    this.save(this.data);
  }
}

export const listsStore = new ListsStore();
