import { readLocalSnapshot, writeLocalSnapshot } from "../../lib/localSnapshotStore";
import { registerBeforeCloseSave } from "../../lib/saveDrain";
import { createInitialSnapshot } from "./mindMapSnapshot";
import type { MindMapDocument, MindMapSnapshot } from "./mindMapTypes";

export async function loadMindMap(courseId: string, mapId: string): Promise<MindMapDocument> {
  const key = `fishworker:mindmap:${courseId}:${mapId}`;
  const data = await readLocalSnapshot<MindMapDocument>(key);

  if (!data) {
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
    await writeLocalSnapshot(key, "mindmap", newDoc);
    return newDoc;
  }

  return data;
}

export async function saveMindMap(courseId: string, mapId: string, snapshot: MindMapSnapshot): Promise<void> {
  const key = `fishworker:mindmap:${courseId}:${mapId}`;

  
  const title = snapshot.root.data.text || "思维导图";
  
  // Count nodes
  let nodeCount = 0;
  const stack = [snapshot.root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    nodeCount++;
    if (node.children) {
      stack.push(...node.children);
    }
  }

  const newDoc: MindMapDocument = {
    courseId,
    mapId,
    title,
    snapshot,
    updatedAt: new Date().toISOString(),
    nodeCount,
  };

  await writeLocalSnapshot(key, "mindmap", newDoc);
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
