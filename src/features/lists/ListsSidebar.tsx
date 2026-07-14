import { useState, useRef, useEffect, cloneElement, ReactElement, ReactNode } from 'react';
import { Plus, Folder as FolderIcon, ChevronDown, MoreHorizontal, BookOpen, Briefcase, Home, Package, Activity, Star, Trash2 } from 'lucide-react';
import { List, Folder } from './listsTypes';
import { ConfirmBubble } from './ConfirmBubble';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { listsStore } from './listsStore';

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
  onEditList,
  onPinList,
  onDuplicateList,
  onDeleteList,
  onDataChange,
  isCollapsed
}: ListsSidebarProps) {
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  
  // Dropdown state
  const [activeDropdown, setActiveDropdown] = useState<{type: 'folder' | 'list', id: string} | null>(null);
  const [deleteConfirmListId, setDeleteConfirmListId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && (target as Element).closest?.('.confirm-bubble')) {
        return; // Ignore clicks inside the confirm bubble
      }
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setActiveDropdown(null);
        setDeleteConfirmListId(null);
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
    const { over } = event;
    if (!over) {
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
    if (active.id !== over?.id && over) {
      const activeList = lists.find(l => l.id === active.id);
      if (!activeList) return;

      const overId = String(over.id);
      let targetFolderId: string | null = null;
      let targetIndex: number | undefined = undefined;

      if (overId === 'standalone-area') {
        targetFolderId = null;
      } else if (over.data?.current?.type === 'folder' || folders.some(f => f.id === overId)) {
        targetFolderId = overId;
      } else {
        const overList = lists.find(l => l.id === overId);
        if (overList) {
          targetFolderId = overList.folderId;
          const siblingLists = lists.filter(l => l.folderId === targetFolderId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          targetIndex = siblingLists.findIndex(l => l.id === overId);
          
          if (activeList.folderId === targetFolderId) {
            const oldIndex = siblingLists.findIndex(l => l.id === active.id);
            if (oldIndex !== -1 && targetIndex !== -1) {
              const newSiblingLists = arrayMove(siblingLists, oldIndex, targetIndex);
              listsStore.reorderLists(newSiblingLists.map(l => l.id));
              onDataChange();
              return;
            }
          }
        }
      }

      if (activeList.folderId !== targetFolderId || targetIndex !== undefined) {
        listsStore.moveList(active.id as string, targetFolderId, targetIndex);
        onDataChange();
      }
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
          {folders.map(folder => {
            const isCollapsed = collapsedFolders[folder.id];
            const folderLists = listsByFolder[folder.id] || [];
            
            const activeList = lists.find(l => l.id === activeDragId);
            const isTarget = dragOverFolderId === folder.id && activeList?.folderId !== folder.id;
            
            return (
              <div key={folder.id} className="lists-folder-group">
                <DroppableArea 
                  id={folder.id} 
                  data={{ type: 'folder' }}
                  className={`lists-folder-header ${isCollapsed ? 'collapsed' : ''} ${isTarget ? 'droppable-over-target' : ''}`}
                  onClick={() => toggleFolder(folder.id)}
                >
                  <ChevronDown size={14} className="chevron-icon" />
                  <FolderIcon size={16} className="folder-icon" />
                  <span>{folder.name}</span>
                  {folder.isPinned && <span style={{marginLeft: '4px', fontSize: '10px', color: 'var(--accent)'}}>📌</span>}
                  
                  <div className="lists-item-actions-wrapper" onClick={e => e.stopPropagation()}>
                    <MoreHorizontal 
                      size={16} 
                      className="lists-folder-actions" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown?.id === folder.id ? null : {type: 'folder', id: folder.id});
                      }} 
                    />
                    {activeDropdown?.type === 'folder' && activeDropdown.id === folder.id && (
                      <div className="lists-dropdown-menu" ref={dropdownRef}>
                        <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onAddClick(folder.id); }}>添加清单</div>
                        <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onEditFolder(folder); }}>编辑</div>
                        <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onPinFolder(folder); }}>{folder.isPinned ? '取消置顶' : '置顶'}</div>
                      </div>
                    )}
                  </div>
                </DroppableArea>
                
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
                  {list.isPinned && <span style={{marginLeft: '4px', fontSize: '10px', color: 'var(--accent)'}}>📌</span>}
                  
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
                          setActiveDropdown(activeDropdown?.id === list.id ? null : {type: 'list', id: list.id});
                        }} 
                      />
                      {activeDropdown?.type === 'list' && activeDropdown.id === list.id && (
                        <div className="lists-dropdown-menu" ref={dropdownRef}>
                          <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onEditList(list); }}>编辑</div>
                          <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onPinList(list); }}>{list.isPinned ? '取消置顶' : '置顶'}</div>
                          <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onDuplicateList(list); }}>复制</div>
                          <ConfirmBubble
                            isOpen={deleteConfirmListId === list.id}
                            message={`确定要删除清单 "${list.name}" 吗？`}
                            position="right"
                            onConfirm={() => {
                              onDeleteList(list);
                              setDeleteConfirmListId(null);
                              setActiveDropdown(null);
                            }}
                            onCancel={() => setDeleteConfirmListId(null)}
                          >
                            <div 
                              className="lists-dropdown-item text-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmListId(list.id);
                              }}
                            >
                              <Trash2 size={14} /> 删除
                            </div>
                          </ConfirmBubble>
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
              {list.isPinned && <span style={{marginLeft: '4px', fontSize: '10px', color: 'var(--accent)'}}>📌</span>}
              
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
                      setActiveDropdown(activeDropdown?.id === list.id ? null : {type: 'list', id: list.id});
                    }} 
                  />
                  {activeDropdown?.type === 'list' && activeDropdown.id === list.id && (
                    <div className="lists-dropdown-menu" ref={dropdownRef}>
                      <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onEditList(list); }}>编辑</div>
                      <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onPinList(list); }}>{list.isPinned ? '取消置顶' : '置顶'}</div>
                      <div className="lists-dropdown-item" onClick={() => { setActiveDropdown(null); onDuplicateList(list); }}>复制</div>
                      <ConfirmBubble
                        isOpen={deleteConfirmListId === list.id}
                        message={`确定要删除清单 "${list.name}" 吗？`}
                        position="right"
                        onConfirm={() => {
                          onDeleteList(list);
                          setDeleteConfirmListId(null);
                          setActiveDropdown(null);
                        }}
                        onCancel={() => setDeleteConfirmListId(null)}
                      >
                        <div 
                          className="lists-dropdown-item text-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmListId(list.id);
                          }}
                        >
                          <Trash2 size={14} /> 删除
                        </div>
                      </ConfirmBubble>
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
