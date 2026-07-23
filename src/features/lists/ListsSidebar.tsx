import { useState, useRef, useEffect, cloneElement, ReactElement, ReactNode } from 'react';
import { Plus, Folder as FolderIcon, ChevronDown, MoreHorizontal, BookOpen, Briefcase, Home, Package, Activity, Star } from 'lucide-react';
import { List, Folder } from './listsTypes';
import { useConfirmDialog } from '../../components/ui/ConfirmDeleteDialog';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { useListsStore } from './listsStore';
import { computeListReorder } from './listsReorder';

function DroppableArea({ id, data, children, className, style, onClick }: any) {
  const { setNodeRef, isOver } = useDroppable({ id, data });
  const dynamicClassName = `${className || ''} ${isOver ? 'droppable-over' : ''}`.trim();
  return <div ref={setNodeRef} className={dynamicClassName} style={style} onClick={onClick}>{children}</div>;
}

interface ListsSidebarProps {
  lists: List[];
  folders: Folder[];
  activeListId: string | null;
  onSelectList: (id: string) => void;
  onAddClick: (folderId?: string) => void;

  onEditFolder: (folder: Folder) => void;
  onPinFolder: (folder: Folder) => void;
  onDissolveFolder: (folder: Folder) => void;

  onEditList: (list: List) => void;
  onPinList: (list: List) => void;
  onDuplicateList: (list: List) => void;
  onDeleteList: (list: List) => void;
  onDataChange: () => void;
  isCollapsed?: boolean;
}

const ICON_MAP: Record<string, ReactNode> = {
  BookOpen: <BookOpen size={16} />,
  Briefcase: <Briefcase size={16} />,
  Home: <Home size={16} />,
  Package: <Package size={16} />,
  Activity: <Activity size={16} />,
  Star: <Star size={16} />
};

export function ListsSidebar({
  lists,
  folders,
  activeListId,
  onSelectList,
  onAddClick,
  onEditFolder,
  onPinFolder,
  onDissolveFolder,
  onEditList,
  onPinList,
  onDuplicateList,
  onDeleteList,
  onDataChange,
  isCollapsed
}: ListsSidebarProps) {
  const store = useListsStore();
  const { confirm: confirmDelete } = useConfirmDialog();
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState<{ type: 'folder' | 'list', id: string } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setActiveDragId(String(event.active.id));
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) {
      setDragOverFolderId(null);
      return;
    }
    // If active is a folder, we don't highlight folders as targets for nesting
    const activeFolder = folders.some(f => f.id === active.id);
    if (activeFolder) {
      setDragOverFolderId(null);
      return;
    }
    const overId = String(over.id);
    if (overId === 'standalone-area') {
      setDragOverFolderId('standalone-area');
    } else if (over.data?.current?.type === 'folder' || folders.some(f => f.id === overId)) {
      setDragOverFolderId(overId);
    } else {
      const overList = lists.find(l => l.id === overId);
      if (overList) setDragOverFolderId(overList.folderId || 'standalone-area');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    setDragOverFolderId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const overId = String(over.id);
    const overData = over.data?.current as { type?: string } | undefined;

    let overType: 'folder' | 'standalone' | 'list' | 'other' = 'other';
    if (overId === 'standalone-area') overType = 'standalone';
    else if (overData?.type === 'folder' || folders.some(f => f.id === overId)) overType = 'folder';
    else if (lists.some(l => l.id === overId)) overType = 'list';

    const action = computeListReorder({
      activeId: String(active.id),
      overId,
      lists,
      folders,
      overType,
    });

    switch (action.kind) {
      case 'reorder': {
        // 判断是 folder reorder 还是 list reorder：看 activeId 是否在 folders 中
        if (folders.some(f => f.id === String(active.id))) {
          store.reorderFolders(action.newOrder);
        } else {
          store.reorderLists(action.newOrder);
        }
        onDataChange();
        break;
      }
      case 'move':
        store.moveList(String(active.id), action.targetGroup, action.targetIndex);
        onDataChange();
        break;
    }
  };

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const getIcon = (iconName: string, color: string) => {
    const icon = ICON_MAP[iconName] || <BookOpen size={16} />;
    return cloneElement(icon as ReactElement<any>, { color: color !== 'none' ? color : 'var(--text-strong)' });
  };

  const standaloneLists = lists.filter(l => !l.folderId);
  const listsByFolder: Record<string, List[]> = {};
  folders.forEach(f => {
    listsByFolder[f.id] = lists.filter(l => l.folderId === f.id);
  });

  return (
    <aside className={`lists-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="lists-sidebar-header">
        <span>清单</span>
        <div className="lists-add-btn" onClick={() => onAddClick()}>
          <Plus size={16} />
        </div>
      </div>

      <div className="lists-tree">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
          {/* Render folders and their nested lists */}
          <SortableContext items={folders.map(f => f.id)} strategy={verticalListSortingStrategy}>
            {folders.map(folder => {
              const isCollapsed = collapsedFolders[folder.id];
              const folderLists = listsByFolder[folder.id] || [];

              const activeList = lists.find(l => l.id === activeDragId);
              const isTarget = dragOverFolderId === folder.id && activeList?.folderId !== folder.id;

              return (
                <div key={folder.id} className="lists-folder-group">
                  <SortableItem id={folder.id}>
                    <DroppableArea
                      id={folder.id}
                      data={{ type: 'folder' }}
                      className={`lists-folder-header ${isCollapsed ? 'collapsed' : ''} ${isTarget ? 'droppable-over-target' : ''}`}
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <ChevronDown size={14} className="chevron-icon" />
                      <FolderIcon size={16} className="folder-icon" />
                      <span>{folder.name}</span>
                      {folder.isPinned && <span style={{ marginLeft: '4px', fontSize: '10px', color: 'var(--accent)' }}>📌</span>}

                      <div className="lists-item-actions-wrapper" onClick={e => e.stopPropagation()}>
                        <MoreHorizontal
                          size={16}
                          className="lists-folder-actions"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDropdown(activeDropdown?.id === folder.id ? null : { type: 'folder', id: folder.id });
                          }}
                        />
                        {activeDropdown?.type === 'folder' && activeDropdown.id === folder.id && (
                          <div className="lists-dropdown-menu" ref={dropdownRef}>
                            <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onAddClick(folder.id); }}>添加清单</div>
                            <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onEditFolder(folder); }}>编辑</div>
                            <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onPinFolder(folder); }}>{folder.isPinned ? '取消置顶' : '置顶'}</div>
                            <div
                              className="lists-dropdown-item text-danger"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setActiveDropdown(null);
                                const confirmed = await confirmDelete({
                                  title: '解散文件夹',
                                  description: `确定要解散文件夹 "${folder.name}" 吗？（其中的清单不会被删除）`,
                                  confirmText: '解散',
                                });
                                if (confirmed) {
                                  onDissolveFolder(folder);
                                }
                              }}
                            >
                              解散
                            </div>
                          </div>
                        )}
                      </div>
                    </DroppableArea>
                  </SortableItem>

                  {!isCollapsed && (
                    <SortableContext items={folderLists.map(l => l.id)} strategy={verticalListSortingStrategy}>
                      {folderLists.map(list => (
                        <SortableItem key={list.id} id={list.id}>
                          <div
                            className={`lists-item nested ${activeListId === list.id ? 'active' : ''}`}
                            onClick={() => onSelectList(list.id)}
                          >
                            <div className="lists-item-icon">
                              {getIcon(list.icon, list.color)}
                            </div>
                            <span>{list.name}</span>
                            {list.isPinned && <span style={{ marginLeft: '4px', fontSize: '10px', color: 'var(--accent)' }}>📌</span>}

                            <div className="lists-item-count-wrapper">
                              {list.itemCount !== undefined && list.itemCount > 0 && (
                                <span className="lists-item-count">{list.itemCount}</span>
                              )}
                              <div className="lists-item-actions-wrapper" onClick={e => e.stopPropagation()}>
                                <MoreHorizontal
                                  size={16}
                                  className={`lists-item-more-action ${activeDropdown?.type === 'list' && activeDropdown.id === list.id ? 'active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdown(activeDropdown?.id === list.id ? null : { type: 'list', id: list.id });
                                  }}
                                />
                                {activeDropdown?.type === 'list' && activeDropdown.id === list.id && (
                                  <div className="lists-dropdown-menu" ref={dropdownRef}>
                                    <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onEditList(list); }}>编辑</div>
                                    <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onPinList(list); }}>{list.isPinned ? '取消置顶' : '置顶'}</div>
                                    <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onDuplicateList(list); }}>复制</div>
                                    <div
                                      className="lists-dropdown-item text-danger"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setActiveDropdown(null);
                                        const confirmed = await confirmDelete({
                                          title: '删除清单',
                                          description: `确定要删除清单 "${list.name}" 吗？`,
                                          confirmText: '删除',
                                        });
                                        if (confirmed) {
                                          onDeleteList(list);
                                        }
                                      }}
                                    >
                                      删除
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </SortableItem>
                      ))}
                    </SortableContext>
                  )}
                </div>
              );
            })}
          </SortableContext>

          {folders.length > 0 && standaloneLists.length > 0 && <div style={{ height: '12px' }} />}

          {/* Render standalone lists */}
          {(() => {
            const activeList = lists.find(l => l.id === activeDragId);
            const isTargetStandalone = dragOverFolderId === 'standalone-area' && activeList && activeList.folderId !== null;
            return (
              <DroppableArea id="standalone-area" data={{ type: 'folder' }} className={isTargetStandalone ? 'droppable-over-target' : ''} style={{ flex: 1, minHeight: '50px', paddingBottom: '20px', borderRadius: '6px' }}>
                <SortableContext items={standaloneLists.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  {standaloneLists.map(list => (
                    <SortableItem key={list.id} id={list.id}>
                      <div
                        className={`lists-item ${activeListId === list.id ? 'active' : ''}`}
                        onClick={() => onSelectList(list.id)}
                      >
                        <div className="lists-item-icon">
                          {getIcon(list.icon, list.color)}
                        </div>
                        <span>{list.name}</span>
                        {list.isPinned && <span style={{ marginLeft: '4px', fontSize: '10px', color: 'var(--accent)' }}>📌</span>}

                        <div className="lists-item-count-wrapper">
                          {list.itemCount !== undefined && list.itemCount > 0 && (
                            <span className="lists-item-count">{list.itemCount}</span>
                          )}
                          <div className="lists-item-actions-wrapper" onClick={e => e.stopPropagation()}>
                            <MoreHorizontal
                              size={16}
                              className={`lists-item-more-action ${activeDropdown?.type === 'list' && activeDropdown.id === list.id ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdown(activeDropdown?.id === list.id ? null : { type: 'list', id: list.id });
                              }}
                            />
                            {activeDropdown?.type === 'list' && activeDropdown.id === list.id && (
                              <div className="lists-dropdown-menu" ref={dropdownRef}>
                                <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onEditList(list); }}>编辑</div>
                                <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onPinList(list); }}>{list.isPinned ? '取消置顶' : '置顶'}</div>
                                <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onDuplicateList(list); }}>复制</div>
                                <div
                                  className="lists-dropdown-item text-danger"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setActiveDropdown(null);
                                    const confirmed = await confirmDelete({
                                      title: '删除清单',
                                      description: `确定要删除清单 "${list.name}" 吗？`,
                                      confirmText: '删除',
                                    });
                                    if (confirmed) {
                                      onDeleteList(list);
                                    }
                                  }}
                                >
                                  删除
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </SortableItem>
                  ))}
                </SortableContext>
              </DroppableArea>
            );
          })()}
        </DndContext>
      </div>
    </aside>
  );
}
