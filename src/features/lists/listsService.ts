import { invoke } from '@tauri-apps/api/core';
import type { List, Folder, Note, NoteGroup, ListsData } from './listsTypes';

/**
 * listsService — the data-access seam for the Lists feature.
 *
 * All Tauri invoke calls live here; the store calls this service and never
 * imports `invoke` directly. The service does DTO shaping and error logging,
 * and returns promises so the store (or the sync engine) can chain on them.
 *
 * The shape of each DTO (camelCase field names, null-defaulted foreign keys)
 * is concentrated in this one module — fixing a column rename or adding a
 * field happens here, not at every call site.
 */

// ── Init / bootstrap ─────────────────────────────────────────────────────────

export type ListLoadAllPayload = {
  folders: Array<{ id: string; name: string; isPinned: boolean; sortOrder: number }>;
  lists: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    viewType: string;
    folderId: string | null;
    isPinned: boolean;
    sortOrder: number;
    itemCount: number;
  }>;
  noteGroups: Array<{ id: string; listId: string; name: string; sortOrder: number }>;
  notes: Array<{
    id: string;
    listId: string;
    groupId: string | null;
    title: string;
    content: string;
    isPinned: boolean;
    sortOrder: number;
    createdAt: number;
    updatedAt: number;
  }>;
  templates: Array<{ id: string; name: string; content: string }>;
};

export async function migrateFromLocal(data: ListsData): Promise<void> {
  try {
    await invoke('list_migrate_from_local', { data });
  } catch (e) {
    console.error('[listsService] migrate_from_local failed:', e);
    throw e;
  }
}

export async function loadAll(): Promise<ListLoadAllPayload> {
  try {
    return await invoke<ListLoadAllPayload>('list_load_all');
  } catch (e) {
    console.error('[listsService] load_all failed:', e);
    throw e;
  }
}

// ── Lists ────────────────────────────────────────────────────────────────────

export async function upsertList(list: List): Promise<void> {
  try {
    await invoke('list_upsert_list', {
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
      },
    });
  } catch (e) {
    console.error('[listsService] upsert_list failed:', e);
    throw e;
  }
}

export async function deleteList(id: string): Promise<void> {
  try {
    await invoke('list_delete_list', { id });
  } catch (e) {
    console.error('[listsService] delete_list failed:', e);
    throw e;
  }
}

export async function duplicateList(sourceId: string, newList: List): Promise<void> {
  try {
    await invoke('list_duplicate_list', {
      sourceId,
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
      },
    });
  } catch (e) {
    console.error('[listsService] duplicate_list failed:', e);
    throw e;
  }
}

export async function reorderLists(items: Array<[string, number]>): Promise<void> {
  try {
    await invoke('list_reorder_lists', { items });
  } catch (e) {
    console.error('[listsService] reorder_lists failed:', e);
    throw e;
  }
}

export async function moveList(listId: string, folderId: string | null, sortOrder: number): Promise<void> {
  try {
    await invoke('list_move_list', { listId, folderId, sortOrder });
  } catch (e) {
    console.error('[listsService] move_list failed:', e);
    throw e;
  }
}

// ── Folders ──────────────────────────────────────────────────────────────────

export async function upsertFolder(folder: Folder): Promise<void> {
  try {
    await invoke('list_upsert_folder', {
      folder: {
        id: folder.id,
        name: folder.name,
        isPinned: folder.isPinned || false,
        sortOrder: folder.sortOrder || 0,
      },
    });
  } catch (e) {
    console.error('[listsService] upsert_folder failed:', e);
    throw e;
  }
}

export async function deleteFolder(id: string): Promise<void> {
  try {
    await invoke('list_delete_folder', { id });
  } catch (e) {
    console.error('[listsService] delete_folder failed:', e);
    throw e;
  }
}

export async function reorderFolders(items: Array<[string, number]>): Promise<void> {
  try {
    await invoke('list_reorder_folders', { items });
  } catch (e) {
    console.error('[listsService] reorder_folders failed:', e);
    throw e;
  }
}

// ── Notes ────────────────────────────────────────────────────────────────────

export async function upsertNote(note: Note): Promise<void> {
  try {
    await invoke('list_upsert_note', {
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
      },
    });
  } catch (e) {
    console.error('[listsService] upsert_note failed:', e);
    throw e;
  }
}

export async function deleteNote(id: string): Promise<void> {
  try {
    await invoke('list_delete_note', { id });
  } catch (e) {
    console.error('[listsService] delete_note failed:', e);
    throw e;
  }
}

export async function moveNote(
  noteId: string,
  listId: string,
  groupId: string | null,
  sortOrder: number
): Promise<void> {
  try {
    await invoke('list_move_note', { noteId, listId, groupId, sortOrder });
  } catch (e) {
    console.error('[listsService] move_note failed:', e);
    throw e;
  }
}

export async function reorderNotes(items: Array<[string, number]>): Promise<void> {
  try {
    await invoke('list_reorder_notes', { items });
  } catch (e) {
    console.error('[listsService] reorder_notes failed:', e);
    throw e;
  }
}

// ── Note Groups ──────────────────────────────────────────────────────────────

export async function upsertGroup(group: NoteGroup): Promise<void> {
  try {
    await invoke('list_upsert_group', {
      group: {
        id: group.id,
        listId: group.listId,
        name: group.name,
        sortOrder: group.sortOrder || 0,
      },
    });
  } catch (e) {
    console.error('[listsService] upsert_group failed:', e);
    throw e;
  }
}

export async function deleteGroup(id: string): Promise<void> {
  try {
    await invoke('list_delete_group', { id });
  } catch (e) {
    console.error('[listsService] delete_group failed:', e);
    throw e;
  }
}

// ── Templates (Delegated to templates feature) ───────────────────────────────

export { upsertTemplate, deleteTemplate } from '../templates/templateService';

// ── Export / Import ──────────────────────────────────────────────────────────

export type ImportedMarkdownFile = { title: string; content: string };

export async function pickMultipleMarkdownFiles(): Promise<ImportedMarkdownFile[]> {
  try {
    return await invoke<ImportedMarkdownFile[]>('pick_multiple_markdown_files');
  } catch (e) {
    console.error('[listsService] pick_multiple_markdown_files failed:', e);
    throw e;
  }
}

export async function saveMultipleMarkdownFiles(
  files: Array<{ title: string; content: string }>
): Promise<void> {
  try {
    await invoke('save_multiple_markdown_files', { files });
  } catch (e) {
    console.error('[listsService] save_multiple_markdown_files failed:', e);
    throw e;
  }
}
