import { invoke } from "@tauri-apps/api/core";
import { registerBeforeCloseSave } from "../../lib/saveDrain";
import { createInitialSnapshot } from "./mindMapSnapshot";
import type { MindMapDocument, MindMapSnapshot } from "./mindMapTypes";

export async function loadMindMap(courseId: string, mapId: string): Promise<MindMapDocument> {
  try {
    const data = await invoke<MindMapDocument>("mindmaps_load", { courseId, mapId });
    return data;
  } catch (error) {
    console.warn("Failed to load mind map from backend, creating a new one:", error);
    // Create default
    const title = "思维导图";
    const initialSnapshot = createInitialSnapshot(title);
    const newDoc: MindMapDocument = {
      courseId,
      mapId,
      title,
      snapshot: initialSnapshot,
      updatedAt: new Date().toISOString(),
      nodeCount: 1,
    };
    await invoke("mindmaps_save", { 
      request: {
        courseId,
        mapId,
        title,
        snapshot: initialSnapshot
      }
    });
    return newDoc;
  }
}

export async function saveMindMap(courseId: string, mapId: string, snapshot: MindMapSnapshot): Promise<void> {
  const title = snapshot.root.data.text || "思维导图";
  
  await invoke("mindmaps_save", { 
    request: {
      courseId,
      mapId,
      title,
      snapshot
    }
  });
}

// Simple debounce for auto-save
let saveTimer: number | null = null;
let latestSaveArgs: { courseId: string; mapId: string; snapshot: MindMapSnapshot } | null = null;

export function debounceSaveMindMap(courseId: string, mapId: string, snapshot: MindMapSnapshot) {
  latestSaveArgs = { courseId, mapId, snapshot };
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
  }
  saveTimer = window.setTimeout(async () => {
    saveTimer = null;
    if (latestSaveArgs) {
      const args = latestSaveArgs;
      latestSaveArgs = null;
      await saveMindMap(args.courseId, args.mapId, args.snapshot);
    }
  }, 1000); // 1s debounce
}

// Ensure save before close
registerBeforeCloseSave(async () => {
  if (saveTimer !== null) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (latestSaveArgs) {
    const args = latestSaveArgs;
    latestSaveArgs = null;
    await saveMindMap(args.courseId, args.mapId, args.snapshot);
  }
});
