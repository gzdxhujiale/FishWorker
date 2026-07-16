import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { SlashCommandsList } from './SlashCommandsList';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: any; range: any }) => void;
}

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export const getSuggestionItems = ({ query }: { query: string }): SlashCommandItem[] => {
  const items: SlashCommandItem[] = [
    {
      title: '正文',
      description: '输入普通段落文本',
      icon: 'Type',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setParagraph().run();
      },
    },
    {
      title: '标题 1',
      description: '大标题',
      icon: 'Heading1',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
      },
    },
    {
      title: '标题 2',
      description: '中等标题',
      icon: 'Heading2',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
      },
    },
    {
      title: '标题 3',
      description: '小标题',
      icon: 'Heading3',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
      },
    },
    {
      title: '无序列表',
      description: '创建一个项目符号列表',
      icon: 'List',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: '有序列表',
      description: '创建一个编号列表',
      icon: 'ListOrdered',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: '任务列表',
      description: '创建待办任务勾选列表',
      icon: 'CheckSquare',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: '引用块',
      description: '插入引述段落块',
      icon: 'Quote',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: '代码块',
      description: '插入带语法高亮的代码框',
      icon: 'Code',
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
  ];

  return items.filter(item =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.description.toLowerCase().includes(query.toLowerCase())
  );
};

export const renderSuggestion = () => {
  let component: any;
  let popup: TippyInstance | null = null;

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(SlashCommandsList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      const tippyInstances = tippy('body', {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: 'manual',
        placement: 'bottom-start',
      });
      popup = Array.isArray(tippyInstances) ? tippyInstances[0] : tippyInstances;
    },

    onUpdate(props: any) {
      component.updateProps(props);

      if (!props.clientRect || !popup) {
        return;
      }

      popup.setProps({
        getReferenceClientRect: props.clientRect,
      });
    },

    onKeyDown(props: any) {
      if (props.event.key === 'Escape') {
        if (popup) {
          popup.hide();
        }
        return true;
      }

      return component.ref?.onKeyDown(props);
    },

    onExit() {
      if (popup) {
        popup.destroy();
        popup = null;
      }
      if (component) {
        component.destroy();
        component = null;
      }
    },
  };
};
