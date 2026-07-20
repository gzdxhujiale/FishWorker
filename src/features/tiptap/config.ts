import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import DragHandle from '@tiptap/extension-drag-handle';
import LineHeight from 'tiptap-extension-line-height';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { joinPoint } from '@tiptap/pm/transform';
import { Fragment } from '@tiptap/pm/model';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
import { SlashCommands, getSuggestionItems, renderSuggestion } from './SlashCommands';
import TextAlign from '@tiptap/extension-text-align';

const lowlight = createLowlight(common);

// Custom extension to auto-join adjacent lists of the same type (e.g. after removing separated nodes)
const AutoJoinAdjacentLists = Extension.create({
  name: 'autoJoinAdjacentLists',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autoJoinAdjacentLists'),
        appendTransaction(transactions, _oldState, newState) {
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) return null;

          let tr = newState.tr;
          let joinable: number[] = [];

          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'bulletList' || node.type.name === 'orderedList' || node.type.name === 'taskList') {
              const nextNodePos = pos + node.nodeSize;
              if (nextNodePos < newState.doc.content.size) {
                const nextNode = newState.doc.nodeAt(nextNodePos);
                if (nextNode && nextNode.type.name === node.type.name) {
                  const point = joinPoint(newState.doc, nextNodePos);
                  if (point !== null && point !== undefined) {
                    joinable.push(point);
                  }
                }
              }
            }
            return true;
          });

          if (joinable.length === 0) return null;

          // Join from bottom to top to preserve positions
          joinable.sort((a, b) => b - a);
          joinable.forEach(point => {
            tr.join(point);
          });

          return tr.docChanged ? tr : null;
        },
      }),
    ];
  },
});

// Custom extension: when deleting a list item that has nested child lists,
// promote the children to the parent level instead of deleting them.
const SmartListItemDelete = Extension.create({
  name: 'smartListItemDelete',

  addCommands() {
    return {
      deleteNodePromoteChildren: () => ({ state, tr, dispatch }: any) => {
        const { selection } = state;
        const node = (selection as any).node;
        if (!node) return false;

        const listTypes = ['bulletList', 'orderedList', 'taskList'];

        if (node.type.name === 'listItem' || node.type.name === 'taskItem') {
          // Collect nested list children and their positions within the node
          const nestedLists: { node: any; pos: number }[] = [];
          node.forEach((child: any, offset: number) => {
            if (listTypes.includes(child.type.name)) {
              nestedLists.push({ node: child, pos: offset });
            }
          });

          if (nestedLists.length > 0 && dispatch) {
            const nodeStart = selection.from;

            // Collect all child list items to promote
            const itemsToPromote: any[] = [];
            nestedLists.forEach(({ node: listNode }) => {
              listNode.forEach((item: any) => {
                itemsToPromote.push(item);
              });
            });

            // Delete the entire list item
            tr.delete(nodeStart, nodeStart + node.nodeSize);

            // Insert promoted children at the same position
            if (itemsToPromote.length > 0) {
              tr.insert(nodeStart, Fragment.from(itemsToPromote));
            }
          } else if (dispatch) {
            tr.delete(selection.from, selection.from + node.nodeSize);
          }
          return true;
        }

        // For non-list-item nodes, default delete
        if (dispatch) {
          tr.delete(selection.from, selection.from + node.nodeSize);
        }
        return true;
      },
    } as any;
  },

  addProseMirrorPlugins() {
    const extensionThis = this;
    return [
      new Plugin({
        key: new PluginKey('smartListItemDelete'),
        props: {
          handleKeyDown(view, event) {
            if (event.key !== 'Backspace' && event.key !== 'Delete') return false;

            const { state } = view;
            const { selection } = state;
            const node = (selection as any).node;
            if (!node) return false;
            if (node.type.name !== 'listItem' && node.type.name !== 'taskItem') return false;

            // Only intercept if the list item has nested list children
            const listTypes = ['bulletList', 'orderedList', 'taskList'];
            let hasNestedList = false;
            node.forEach((child: any) => {
              if (listTypes.includes(child.type.name)) hasNestedList = true;
            });
            if (!hasNestedList) return false;

            // Use the custom command
            return (extensionThis.editor.commands as any).deleteNodePromoteChildren();
          },
        },
      }),
    ];
  },
});

interface TiptapConfigOptions {
  enableDragHandle?: boolean;
  enableMarkdown?: boolean;
}

export const getTiptapExtensions = (options: TiptapConfigOptions = {}) => {
  const { enableDragHandle = true, enableMarkdown = true } = options;
  
  const extensions: any[] = [
    StarterKit.configure({
      underline: false,
      codeBlock: false, // Disable default codeBlock to use lowlight instead
    }),
    Underline.configure({}),
    TaskList.configure({}),
    TaskItem.configure({ nested: true }),
    TextStyle.configure({}),
    Color.configure({}),
    Highlight.configure({ multicolor: true }),
    LineHeight.configure({}),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    CodeBlockLowlight.configure({
      lowlight,
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableCell,
    TableHeader,
    SlashCommands.configure({
      suggestion: {
        items: getSuggestionItems,
        render: renderSuggestion,
      },
    }),
    AutoJoinAdjacentLists,
    SmartListItemDelete,
  ];

  if (enableMarkdown) {
    extensions.push(Markdown);
  }

  if (enableDragHandle) {
    extensions.push(DragHandle.configure({
      render: () => {
        const handle = document.createElement('div');
        handle.className = 'drag-handle';
        handle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>`;
        return handle;
      },
      onNodeChange: (props: any) => {
        const { node, editor, pos } = props;
        if (node) {
          (editor as any)._draggedNodePos = pos;
          (editor as any)._draggedNode = node;
        }
      },
      nested: true,
    }));
  }

  return extensions;
};
