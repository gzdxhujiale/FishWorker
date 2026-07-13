import React from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsRight,
  FileText,
  GitBranch,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { CourseSidebar } from "./CourseSidebar";
import { courseApi } from "./courseService";
import type { Course, CourseSection, CourseStore, CourseSyncStatus } from "./courseTypes";
import { MindMapCatalog, type MindMapCatalogCollapseRequest } from "../mindmap/MindMapCatalog";
import {
  MindMapWorkspace,
  type WorkspaceCatalogBoundaryRequest,
  type WorkspaceEditorMode,
  type WorkspaceModeChangeRequest,
  type WorkspaceNodeDeletionRequest,
  type WorkspaceNodeSelectionRequest
} from "../mindmap/MindMapWorkspace";
import type { MindMapOutlineItem, MindMapSelectedNode } from "../mindmap/mindMapTypes";
import { courseContextStore } from "./courseContextStore";
import "./course.css";

type CourseDialogMode = "create" | "edit";
type DetailPaneMode = "catalog" | "format";

function normalizeWorkspaceEditorMode(value: unknown): WorkspaceEditorMode {
  return value === "word" ? value : "mindmap";
}

function getCourseWorkspaceMode(store: CourseStore) {
  const activeCourse = store.courses.find((course) => course.id === store.activeCourseId) ?? null;
  return normalizeWorkspaceEditorMode(activeCourse?.lastWorkspaceMode);
}

export function CoursePanel() {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [courseSections, setCourseSections] = React.useState<CourseSection[]>([]);
  const [activeCourseId, setActiveCourseId] = React.useState<string | null>(null);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [hasLoadedCourseStore, setHasLoadedCourseStore] = React.useState(false);
  const [courseSyncStatus, setCourseSyncStatus] = React.useState<CourseSyncStatus>({ state: "saved", pendingCount: 0 });
  const [dialogMode, setDialogMode] = React.useState<CourseDialogMode | null>(null);
  const [editingCourseId, setEditingCourseId] = React.useState<string | null>(null);
  const [creatingCourseSectionId, setCreatingCourseSectionId] = React.useState<string | null>(null);
  const [draftName, setDraftName] = React.useState("");
  const [draftDescription, setDraftDescription] = React.useState("");
  const [mindMapOutline, setMindMapOutline] = React.useState<MindMapOutlineItem[]>([]);
  const [activeMindMapId, setActiveMindMapId] = React.useState<string | null>(null);
  const [selectedMindMapNode, setSelectedMindMapNode] = React.useState<MindMapSelectedNode>({ id: null, title: "" });
  const [workspaceEditorMode, setWorkspaceEditorMode] = React.useState<WorkspaceEditorMode>("mindmap");
  const [modeChangeRequest, setModeChangeRequest] = React.useState<WorkspaceModeChangeRequest | null>(null);
  const [nodeSelectionRequest, setNodeSelectionRequest] = React.useState<WorkspaceNodeSelectionRequest | null>(null);
  const [nodeDeletionRequest, setNodeDeletionRequest] = React.useState<WorkspaceNodeDeletionRequest | null>(null);
  const [catalogBoundaryRequest, setCatalogBoundaryRequest] = React.useState<WorkspaceCatalogBoundaryRequest | null>(null);
  const [catalogCollapseRequest, setCatalogCollapseRequest] = React.useState<MindMapCatalogCollapseRequest | null>(null);
  const [isLibraryPaneCollapsed, setIsLibraryPaneCollapsed] = React.useState(false);
  const [isCatalogPaneCollapsed, setIsCatalogPaneCollapsed] = React.useState(false);
  const [detailPaneMode, setDetailPaneMode] = React.useState<DetailPaneMode>("catalog");
  const [externalContentRevision] = React.useState(0);
  const catalogCollapseNonceRef = React.useRef(0);
  const catalogBoundaryNonceRef = React.useRef(0);
  const workspaceModePersistRef = React.useRef("");

  const activeCourse = courses.find((course) => course.id === activeCourseId) ?? null;
  const sectionIds = React.useMemo(() => new Set(courseSections.map((section) => section.id)), [courseSections]);
  const sectionNameById = React.useMemo(() => new Map(courseSections.map((section) => [section.id, section.name])), [courseSections]);

  React.useEffect(() => {
    courseContextStore.setState({
      courseTitle: activeCourse?.name ?? "",
      nodeTitle: selectedMindMapNode.title,
      contextText: mindMapOutline.slice(0, 80).map((item) => `${"  ".repeat(Math.max(0, item.level))}${item.title}`).join("\n")
    });
  }, [activeCourse?.name, selectedMindMapNode.title, mindMapOutline]);

  const openDocumentFormatPane = React.useCallback(() => {
    setDetailPaneMode("format");
    setIsCatalogPaneCollapsed(false);
  }, []);

  const closeDocumentFormatPane = React.useCallback(() => {
    setDetailPaneMode("catalog");
  }, []);

  React.useEffect(() => {
    if (workspaceEditorMode === "mindmap" && detailPaneMode === "format") {
      setDetailPaneMode("catalog");
    }
  }, [detailPaneMode, workspaceEditorMode]);

  function applyCourseStore(store: CourseStore) {
    setCourseSections(store.sections ?? []);
    setCourses(store.courses);
    setActiveCourseId(store.activeCourseId);
    setWorkspaceEditorMode(getCourseWorkspaceMode(store));
    setHasLoadedCourseStore(true);
  }

  async function refreshCourseSyncStatus() {
    try {
      setCourseSyncStatus(await courseApi.syncStatus());
    } catch {
      setCourseSyncStatus({ state: "attention", pendingCount: 1 });
    }
  }

  async function runCourseStoreCommand(command: () => Promise<CourseStore>) {
    setCourseSyncStatus((current) => ({ ...current, state: "saving" }));
    try {
      const store = await command();
      applyCourseStore(store);
      await refreshCourseSyncStatus();
      return store;
    } catch (error) {
      await refreshCourseSyncStatus();
      throw error;
    }
  }

  React.useEffect(() => {
    let isCancelled = false;
    courseApi.load()
      .then((store) => {
        if (isCancelled) return;
        applyCourseStore(store);
        void refreshCourseSyncStatus();
      })
      .catch(() => {
        if (isCancelled) return;
        setCourseSyncStatus({ state: "attention", pendingCount: 1 });
      })
      .finally(() => {
        if (!isCancelled) setIsHydrated(true);
      });
    return () => { isCancelled = true; };
  }, []);

  async function retryCourseSync() {
    setCourseSyncStatus((current) => ({ ...current, state: "saving" }));
    try {
      const store = await courseApi.load();
      applyCourseStore(store);
      await refreshCourseSyncStatus();
    } catch {
      setCourseSyncStatus((current) => ({ state: "attention", pendingCount: Math.max(current.pendingCount, 1) }));
    }
  }

  React.useEffect(() => {
    if (activeCourseId && !courses.some((course) => course.id === activeCourseId)) {
      setActiveCourseId(courses[0]?.id ?? null);
    }
  }, [activeCourseId, courses]);

  React.useEffect(() => {
    setMindMapOutline([]);
    setActiveMindMapId(null);
    setSelectedMindMapNode({ id: null, title: "" });
    setWorkspaceEditorMode(normalizeWorkspaceEditorMode(activeCourse?.lastWorkspaceMode));
    setModeChangeRequest(null);
    setNodeSelectionRequest(null);
    setNodeDeletionRequest(null);
    setCatalogBoundaryRequest(null);
  }, [activeCourseId]);

  function openCreateDialog(sectionId: string | null = activeCourse?.sectionId ?? null) {
    const validSectionId = sectionId && sectionIds.has(sectionId) ? sectionId : null;
    setDialogMode("create");
    setEditingCourseId(null);
    setCreatingCourseSectionId(validSectionId);
    setDraftName("");
    setDraftDescription("");
  }

  function openEditDialog(course: Course) {
    setDialogMode("edit");
    setEditingCourseId(course.id);
    setDraftName(course.name);
    setDraftDescription(course.description);
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingCourseId(null);
    setCreatingCourseSectionId(null);
    setDraftName("");
    setDraftDescription("");
  }

  async function createCourseSection(name: string) {
    await runCourseStoreCommand(() => courseApi.createSection(name));
  }

  async function renameCourseSection(sectionId: string, name: string) {
    await runCourseStoreCommand(() => courseApi.renameSection(sectionId, name));
  }

  function toggleCourseSection(sectionId: string, collapsed: boolean) {
    void runCourseStoreCommand(() => courseApi.toggleSection(sectionId, collapsed));
  }

  function toggleAllCourseSections(collapsed: boolean) {
    void runCourseStoreCommand(() => courseApi.toggleAllSections(collapsed));
  }

  function requestCatalogTree(mode: MindMapCatalogCollapseRequest["mode"]) {
    catalogCollapseNonceRef.current += 1;
    setCatalogCollapseRequest({ mode, nonce: catalogCollapseNonceRef.current });
  }

  function deleteCourseSection(section: CourseSection) {
    const affectedCount = courses.filter((course) => course.sectionId === section.id).length;
    const confirmed = window.confirm(
      affectedCount > 0
        ? `确定删除分区「${section.name}」吗？其中 ${affectedCount} 个知识库会移回「未分区」，知识库内容不会删除。`
        : `确定删除分区「${section.name}」吗？`
    );
    if (!confirmed) return;
    void runCourseStoreCommand(() => courseApi.deleteSection(section.id));
  }

  function moveCourseToSection(course: Course, sectionId: string | null) {
    void runCourseStoreCommand(() => courseApi.moveCourse({ id: course.id, sectionId }));
  }

  function reorderCourse(courseId: string, sectionId: string | null, beforeCourseId: string | null) {
    void runCourseStoreCommand(() => courseApi.reorderCourse({ id: courseId, sectionId, beforeCourseId }));
  }

  function reorderCourseSection(sectionId: string, beforeSectionId: string | null) {
    void runCourseStoreCommand(() => courseApi.reorderSection(sectionId, beforeSectionId));
  }

  const saveCourse: React.ComponentProps<"form">["onSubmit"] = (event) => {
    event.preventDefault();
    const name = draftName.trim();
    const description = draftDescription.trim();
    if (!name) return;

    if (dialogMode === "create") {
      const targetSectionId = creatingCourseSectionId && sectionIds.has(creatingCourseSectionId) ? creatingCourseSectionId : null;
      void runCourseStoreCommand(() => courseApi.createCourse({ name, description, sectionId: targetSectionId })).then(closeDialog);
      return;
    }

    if (dialogMode === "edit" && editingCourseId) {
      void runCourseStoreCommand(() => courseApi.renameCourse({ id: editingCourseId, name, description })).then(closeDialog);
    }
  };

  function deleteCourse(course: Course) {
    const confirmed = window.confirm(`确定删除课程「${course.name}」吗？删除后该课程会从列表中移除。`);
    if (!confirmed) return;
    void runCourseStoreCommand(() => courseApi.deleteCourse(course.id));
  }

  function selectCourse(courseId: string) {
    void runCourseStoreCommand(() => courseApi.selectCourse(courseId));
  }

  function requestWorkspaceMode(mode: WorkspaceEditorMode) {
    if (mode === workspaceEditorMode) return;
    if (mode === "mindmap") setDetailPaneMode("catalog");
    setModeChangeRequest({ mode, nonce: Date.now() });
  }

  function handleWorkspaceEditorModeChanged(mode: WorkspaceEditorMode) {
    const nextMode = normalizeWorkspaceEditorMode(mode);
    setWorkspaceEditorMode(nextMode);

    if (!hasLoadedCourseStore || !activeCourseId || activeCourse?.lastWorkspaceMode === nextMode) return;
    const signature = `${activeCourseId}:${nextMode}`;
    if (workspaceModePersistRef.current === signature) return;
    workspaceModePersistRef.current = signature;

    const updatedAt = new Date().toISOString();
    const nextCourses = courses.map((course) =>
      course.id === activeCourseId
        ? { ...course, lastWorkspaceMode: nextMode, updatedAt }
        : course
    );
    setCourses(nextCourses);
    void runCourseStoreCommand(() => courseApi.saveStore({
      sections: courseSections,
      courses: nextCourses,
      activeCourseId
    })).catch(() => {
      workspaceModePersistRef.current = "";
    });
  }

  function selectCatalogNode(item: MindMapOutlineItem) {
    if (!item.nodeId) return;
    setNodeSelectionRequest({ nodeId: item.nodeId, nonce: Date.now() });
  }

  function deleteCatalogNode(item: MindMapOutlineItem) {
    if (!item.nodeId || !item.parentNodeId) return;
    const confirmed = window.confirm(`确定删除“${item.title}”及其分支和文档内容吗？`);
    if (!confirmed) return;
    setNodeDeletionRequest({ nodeId: item.nodeId, nonce: Date.now() });
  }

  function toggleCatalogBoundary(item: MindMapOutlineItem, enabled: boolean) {
    if (!item.nodeId || !item.parentNodeId) return;
    catalogBoundaryNonceRef.current += 1;
    setCatalogBoundaryRequest({
      nodeId: item.nodeId,
      enabled,
      nonce: catalogBoundaryNonceRef.current
    });
  }

  async function copyCatalogNodeDocumentPath(item: MindMapOutlineItem) {
    if (!activeCourse || !item.nodeId) return;
    const sectionName = activeCourse.sectionId ? sectionNameById.get(activeCourse.sectionId) ?? "" : "";
    const locatorPath = await window.aistudyCourseLocators?.createPath?.({
      courseId: activeCourse.id,
      courseName: activeCourse.name,
      courseDescription: activeCourse.description,
      sectionId: activeCourse.sectionId,
      sectionName
    });
    if (!locatorPath) {
      throw new Error("文档路径生成没有完成。");
    }

    const readArgs = activeMindMapId
      ? { courseId: activeCourse.id, mindMapId: activeMindMapId, nodeId: item.nodeId }
      : { courseId: activeCourse.id, nodeId: item.nodeId };
    const pathText = [
      "AIstudy MCP 文档路径",
      `locatorPath: ${locatorPath}`,
      `courseId: ${activeCourse.id}`,
      activeMindMapId ? `mindMapId: ${activeMindMapId}` : "",
      `nodeId: ${item.nodeId}`,
      `nodeTitle: ${item.title.replace(/\s+/g, " ").trim()}`,
      "tool: read_node_document",
      `arguments: ${JSON.stringify(readArgs)}`
    ].filter(Boolean).join("\n");

    if (window.aistudyClipboard?.writeText) {
      await window.aistudyClipboard.writeText(pathText);
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(pathText);
    } else {
      throw new Error("文档路径复制没有完成。");
    }
  }

  return (
    <>
      <main className={`study-layout${isLibraryPaneCollapsed ? " library-collapsed" : ""}${isCatalogPaneCollapsed ? " catalog-collapsed" : ""}`}>
        <button
          className="pane-collapse-button library-toggle"
          title={isLibraryPaneCollapsed ? "展开知识库" : "收起知识库"}
          aria-label={isLibraryPaneCollapsed ? "展开知识库" : "收起知识库"}
          type="button"
          onClick={() => setIsLibraryPaneCollapsed((value) => !value)}
        >
          {isLibraryPaneCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
        <button
          className="pane-collapse-button catalog-toggle-button"
          title={isCatalogPaneCollapsed ? "展开目录" : "收起目录"}
          aria-label={isCatalogPaneCollapsed ? "展开目录" : "收起目录"}
          type="button"
          onClick={() => setIsCatalogPaneCollapsed((value) => !value)}
        >
          {isCatalogPaneCollapsed ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
        
        <CourseSidebar
          sections={courseSections}
          courses={courses}
          activeCourseId={activeCourseId}
          isHydrated={isHydrated}
          syncStatus={courseSyncStatus}
          onRetrySync={() => void retryCourseSync()}
          onSelectCourse={selectCourse}
          onCreateCourse={openCreateDialog}
          onEditCourse={openEditDialog}
          onDeleteCourse={deleteCourse}
          onCreateSection={createCourseSection}
          onRenameSection={renameCourseSection}
          onToggleSection={toggleCourseSection}
          onToggleAllSections={toggleAllCourseSections}
          onDeleteSection={deleteCourseSection}
          onMoveCourse={moveCourseToSection}
          onReorderCourse={reorderCourse}
          onReorderSection={reorderCourseSection}
        />

        <section className="canvas-pane" aria-label="学习工作台">
          <div className="canvas-toolbar">
            <div>
              <h2>{activeCourse ? activeCourse.name : "未选择课程"}</h2>
            </div>
            <div className="workspace-mode-switch" aria-label="编辑器切换">
              <button
                type="button"
                className={workspaceEditorMode === "mindmap" ? "active" : ""}
                onClick={() => requestWorkspaceMode("mindmap")}
                disabled={!activeCourse}
              >
                <GitBranch size={15} />
                <span>导图</span>
              </button>
              <button
                type="button"
                className={workspaceEditorMode === "word" ? "active" : ""}
                onClick={() => requestWorkspaceMode("word")}
                disabled={!activeCourse}
              >
                <FileText size={15} />
                <span>文档</span>
              </button>
            </div>
          </div>

          <div className="editor-mount">
            <MindMapWorkspace
              courseId={activeCourse?.id ?? null}
              courseName={activeCourse?.name ?? "New mind map"}
              editorMode={workspaceEditorMode}
              externalChangeRevision={externalContentRevision}
              modeChangeRequest={modeChangeRequest}
              nodeSelectionRequest={nodeSelectionRequest}
              nodeDeletionRequest={nodeDeletionRequest}
              catalogBoundaryRequest={catalogBoundaryRequest}
              onEditorModeChange={handleWorkspaceEditorModeChanged}
              onOutlineChanged={setMindMapOutline}
              onMindMapIdChanged={setActiveMindMapId}
              onNodeSelectedChanged={setSelectedMindMapNode}
              isCatalogPaneCollapsed={isCatalogPaneCollapsed}
              documentDetailPaneMode={detailPaneMode}
              onOpenDocumentFormatPane={openDocumentFormatPane}
              onCloseDocumentFormatPane={closeDocumentFormatPane}
            />
          </div>
        </section>

        <aside className="detail-pane" aria-label={workspaceEditorMode === "word" && detailPaneMode === "format" ? "排版" : "目录"}>
          <div className="detail-heading">
            <div>
              <h2>{workspaceEditorMode === "word" && detailPaneMode === "format" ? "排版" : "目录"}</h2>
            </div>
            {!(workspaceEditorMode === "word" && detailPaneMode === "format") && mindMapOutline.length > 0 ? (
              <div className="catalog-tree-toolbar" aria-label="目录视图">
                <button
                  type="button"
                  title="展开全部；右键只展开父级"
                  onClick={() => requestCatalogTree("expand-all")}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    requestCatalogTree("expand-branches");
                  }}
                >
                  <ChevronsDown size={14} />
                  <span>展开</span>
                </button>
                <button type="button" onClick={() => requestCatalogTree("collapse-all")}>
                  <ChevronsRight size={14} />
                  <span>收叠</span>
                </button>
              </div>
            ) : null}
            {workspaceEditorMode === "word" ? (
              <div className="detail-mode-switch" aria-label="右侧面板切换">
                <button
                  type="button"
                  className={detailPaneMode === "catalog" ? "active" : ""}
                  onClick={() => setDetailPaneMode("catalog")}
                >
                  <FileText size={14} />
                  <span>目录</span>
                </button>
                <button
                  type="button"
                  className={detailPaneMode === "format" ? "active" : ""}
                  onClick={openDocumentFormatPane}
                >
                  <SlidersHorizontal size={14} />
                  <span>排版</span>
                </button>
              </div>
            ) : null}
          </div>

          {workspaceEditorMode === "word" && detailPaneMode === "format" ? (
            <div id="document-format-panel-slot" className="document-format-panel-slot" />
          ) : activeCourse && mindMapOutline.length > 0 ? (
            <nav className="catalog-panel" aria-label="导图目录">
              <MindMapCatalog
                items={mindMapOutline}
                selectedNodeId={selectedMindMapNode.id}
                resetKey={activeCourseId ?? ""}
                collapseRequest={catalogCollapseRequest}
                onNodeSelect={selectCatalogNode}
                onNodeCopyDocumentPath={copyCatalogNodeDocumentPath}
                onNodeDelete={deleteCatalogNode}
                onNodeToggleCatalogBoundary={toggleCatalogBoundary}
              />
            </nav>
          ) : (
            <div className="detail-empty-state">
              <strong>{activeCourse ? "暂无目录" : "未选择课程"}</strong>
            </div>
          )}
        </aside>
      </main>

      {dialogMode ? (
        <div className="modal-backdrop" role="presentation">
          <form className="course-dialog" onSubmit={saveCourse} aria-label={dialogMode === "create" ? "新建课程" : "编辑课程"}>
            <div className="dialog-heading">
              <div>
                <p className="section-kicker">课程管理</p>
                <h2>{dialogMode === "create" ? "新建课程" : "编辑课程"}</h2>
              </div>
              <button className="icon-button" title="关闭" aria-label="关闭" type="button" onClick={closeDialog}>
                <X size={17} />
              </button>
            </div>

            <label className="form-field">
              <span>课程名称</span>
              <input value={draftName} onChange={(event) => setDraftName(event.target.value)} autoFocus maxLength={40} placeholder="课程名称" />
            </label>

            <label className="form-field">
              <span>课程描述</span>
              <textarea
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                maxLength={120}
                placeholder="课程描述"
              />
            </label>

            <div className="dialog-actions">
              <button className="secondary-button" type="button" onClick={closeDialog}>
                取消
              </button>
              <button className="primary-button" type="submit" disabled={!draftName.trim()}>
                <Check size={16} />
                保存
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
