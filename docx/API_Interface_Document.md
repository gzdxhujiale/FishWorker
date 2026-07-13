# Knowledge Base Mindmap & Document Integration API Interface Document

This document outlines the interface and API changes implemented for the mindmap and document integration feature.

## 1. `simple-mind-map` Event Binding
To support double-clicking a node to enter the word document editor, we bind to the underlying `node_dblclick` event exposed by `simple-mind-map`.

### Updated Types
**File**: `src/features/mindmap/mindMapTypes.ts`

```typescript
export type MindMapEditorEvents = {
  // Existing events...
  onSnapshotChanged?: (snapshot: MindMapSnapshot) => void;
  onNodeSelected?: (node: MindMapSelectedNode) => void;
  
  // New event added
  onNodeDoubleClicked?: (node: MindMapSelectedNode) => void;
  
  // Existing events...
  onViewportChanged?: (state: MindMapViewportState) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
};
```

### Adapter Implementation
**File**: `src/features/mindmap/simpleMindMapAdapter.ts`

The `simpleMindMapAdapter` listens for `node_dblclick` and invokes the `onNodeDoubleClicked` callback, passing the properly typed `MindMapSelectedNode`.

```typescript
// Event emission
const emitNodeDblClick = (node: unknown, activeNodeList?: unknown) => {
  installRuntimeNodeExtensions();
  ensureStableRenderTreeNodeIds(editor);
  const activeNode = readActiveNodeFromEvent(editor, node, activeNodeList);
  if (activeNode) {
    events.onNodeDoubleClicked?.(toSelectedNode(activeNode));
  }
};

// Event registration
editor.on("node_dblclick", emitNodeDblClick);
editor.off("node_dblclick", emitNodeDblClick);
```

## 2. Document Markdown Export Implementation
We added an explicit `exportMd` function alongside `exportDocx`. Since `window.aistudyKnowledgeDocuments` relies on a Tauri rust backend to generate `.docx` and we didn't add a `.md` backend yet, we use a recursive AST-to-text algorithm to extract pure string values from the `nextSnapshot.content.main` tree in `KnowledgeDocumentWorkspace.tsx` and trigger an in-browser Blob download.

### Export Method Signature
**File**: `src/features/documents/KnowledgeDocumentWorkspace.tsx`

```typescript
const exportMd = React.useCallback(async () => {
    // 1. Fetch latest async snapshot from editor
    // 2. Map and extract text values using recursive extractText helper
    // 3. Encode content using Blob as `text/markdown;charset=utf-8`
    // 4. Dispatch browser download through dynamically created <a> tag
}, [documentBinding, isExportingDocx, selectedNode.title, snapshot]);
```
