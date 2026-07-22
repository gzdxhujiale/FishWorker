import { invoke } from '@tauri-apps/api/core';
import type { Template } from './templateTypes';

/**
 * templateService — data-access seam for the Templates feature.
 * Concentrates Tauri IPC calls for template persistence.
 */

export async function upsertTemplate(template: Template): Promise<void> {
  try {
    await invoke('list_upsert_template', { template });
  } catch (e) {
    console.error('[templateService] upsert_template failed:', e);
    throw e;
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  try {
    await invoke('list_delete_template', { id });
  } catch (e) {
    console.error('[templateService] delete_template failed:', e);
    throw e;
  }
}
