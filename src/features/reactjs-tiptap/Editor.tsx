import { useCallback, useEffect, useRef, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { MoreHorizontal } from 'lucide-react';

import { RichTextProvider } from 'reactjs-tiptap-editor';
import { localeActions } from 'reactjs-tiptap-editor/locale-bundle';

// Base Kit
import { Document } from '@tiptap/extension-document';
import { HardBreak } from '@tiptap/extension-hard-break';
import { ListItem } from '@tiptap/extension-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Dropcursor,
  Gapcursor,
  Placeholder,
  TrailingNode,
} from '@tiptap/extensions';

// build extensions
import {
  Blockquote,
  RichTextBlockquote,
} from 'reactjs-tiptap-editor/blockquote';
import { Bold, RichTextBold } from 'reactjs-tiptap-editor/bold';
import {
  BulletList,
  RichTextBulletList,
} from 'reactjs-tiptap-editor/bulletlist';
import { Clear, RichTextClear } from 'reactjs-tiptap-editor/clear';
import { Code, RichTextCode } from 'reactjs-tiptap-editor/code';
import { CodeBlock, RichTextCodeBlock } from 'reactjs-tiptap-editor/codeblock';
import { Color, RichTextColor } from 'reactjs-tiptap-editor/color';
import { Heading, RichTextHeading } from 'reactjs-tiptap-editor/heading';
import { Highlight, RichTextHighlight } from 'reactjs-tiptap-editor/highlight';
import {
  History,
  RichTextRedo,
  RichTextUndo,
} from 'reactjs-tiptap-editor/history';
import {
  HorizontalRule,
  RichTextHorizontalRule,
} from 'reactjs-tiptap-editor/horizontalrule';
import { Image, RichTextImage } from 'reactjs-tiptap-editor/image';
import { Italic, RichTextItalic } from 'reactjs-tiptap-editor/italic';
import { Link, RichTextLink } from 'reactjs-tiptap-editor/link';
import { MoreMark, RichTextMoreMark } from 'reactjs-tiptap-editor/moremark';
import {
  OrderedList,
  RichTextOrderedList,
} from 'reactjs-tiptap-editor/orderedlist';
import { RichTextStrike, Strike } from 'reactjs-tiptap-editor/strike';
import { RichTextTable, Table } from 'reactjs-tiptap-editor/table';
import { RichTextTaskList, TaskList } from 'reactjs-tiptap-editor/tasklist';
import { RichTextAlign, TextAlign } from 'reactjs-tiptap-editor/textalign';
import {
  RichTextUnderline,
  TextUnderline,
} from 'reactjs-tiptap-editor/textunderline';

// Bubble
import {
  RichTextBubbleImage,
  RichTextBubbleLink,
  RichTextBubbleTable,
  RichTextBubbleText,
  RichTextBubbleMenuDragHandle,
  RichTextBubbleCodeBlock,
} from 'reactjs-tiptap-editor/bubble';
import { createLowlight } from 'lowlight';
import css from 'highlight.js/lib/languages/css';
import js from 'highlight.js/lib/languages/javascript';
import ts from 'highlight.js/lib/languages/typescript';
import html from 'highlight.js/lib/languages/xml';
import bash from 'highlight.js/lib/languages/bash';

import 'reactjs-tiptap-editor/style.css';
import './reactjs-tiptap.css';

import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { CharacterCount } from '@tiptap/extensions';
import { Count } from './extension/Count';

// create a lowlight instance with standard languages
const lowlight = createLowlight();
lowlight.register('html', html);
lowlight.register('css', css);
lowlight.register('js', js);
lowlight.register('ts', ts);
lowlight.register('bash', bash);

const LIMIT = 10000;

const extensions = [
  Document,
  Paragraph,
  Text,
  TextStyle,
  HardBreak,
  ListItem,
  TaskItem,
  Dropcursor,
  Gapcursor,
  Placeholder.configure({
    placeholder: '请输入内容...',
  }),
  TrailingNode,
  CharacterCount.configure({
    limit: LIMIT,
  }),

  History,
  Clear,
  Heading,
  Bold,
  Italic,
  TextUnderline,
  Strike,
  MoreMark,
  Color,
  Highlight,
  BulletList,
  OrderedList,
  TextAlign,
  TaskList,
  Link,
  Image.configure({
    upload: (files: File) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(URL.createObjectURL(files));
        }, 300);
      });
    },
  }),
  Blockquote,
  HorizontalRule,
  Code,
  CodeBlock.configure({
    lowlight,
  }),
  Table,
];

const DEFAULT = `<p dir="auto">请输入记录内容...</p>`;

function debounce(func: any, wait: number) {
  let timeout: NodeJS.Timeout;
  return function (...args: any[]) {
    clearTimeout(timeout);
    // @ts-ignore
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const HeadingSelect = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;
  const getCurrentValue = () => {
    for (let level = 1; level <= 6; level++) {
      if (editor.isActive('heading', { level })) return String(level);
    }
    return '0';
  };

  return (
    <select
      className="toolbar-select"
      onChange={(e) => {
        const val = e.target.value;
        if (val === '0') {
          editor.chain().focus().setParagraph().run();
        } else {
          editor.chain().focus().toggleHeading({ level: parseInt(val) as any }).run();
        }
      }}
      value={getCurrentValue()}
      style={{
        padding: '2px 8px',
        height: '28px',
        lineHeight: '24px',
        borderRadius: '6px',
        border: '1px solid var(--color-border, #e5e7eb)',
        background: 'var(--color-bg-subtle, #f9fafb)',
        color: 'var(--color-text, #374151)',
        fontSize: '13px',
        outline: 'none',
        cursor: 'pointer'
      }}
    >
      <option value="0">正文</option>
      <option value="1">标题 1</option>
      <option value="2">标题 2</option>
      <option value="3">标题 3</option>
      <option value="4">标题 4</option>
      <option value="5">标题 5</option>
      <option value="6">标题 6</option>
    </select>
  );
};

const getFoldedState = (containerWidth: number) => {
  const foldedIds = new Set<string>();
  if (containerWidth === 0) {
    return { foldedIds, showMore: false };
  }

  const buffer = 36; // Horizontal padding (12px * 2) + gap & border safety
  const availableWidth = containerWidth - buffer;

  const items = [
    { id: 'codeBlock', width: 36 },
    { id: 'table', width: 36 },
    { id: 'image', width: 36 },
    { id: 'link', width: 36 },
    { id: 'align', width: 36 },
    { id: 'blockquote', width: 36 },
    { id: 'horizontalRule', width: 36 },
    { id: 'code', width: 36 },
    { id: 'moreMark', width: 36 },
    { id: 'taskList', width: 36 },
    { id: 'orderedList', width: 36 },
    { id: 'bulletList', width: 36 },
    { id: 'highlight', width: 36 },
    { id: 'color', width: 36 },
    { id: 'strike', width: 36 },
    { id: 'underline', width: 36 },
    { id: 'italic', width: 36 },
    { id: 'bold', width: 36 },
    { id: 'heading', width: 100 },
    { id: 'clear', width: 36 },
    { id: 'redo', width: 36 },
    { id: 'undo', width: 36 },
  ];

  const totalFoldableWidth = items.reduce((sum, item) => sum + item.width, 0);

  if (availableWidth >= totalFoldableWidth) {
    return { foldedIds, showMore: false };
  }

  let remainingWidth = availableWidth - 36; // Reserve width for "More" icon button (36px)

  let currentFoldableWidth = totalFoldableWidth;
  for (let i = 0; i < items.length; i++) {
    foldedIds.add(items[i].id);
    currentFoldableWidth -= items[i].width;
    if (remainingWidth >= currentFoldableWidth) {
      break;
    }
  }

  return { foldedIds, showMore: true };
};

const RichTextToolbar = ({ containerWidth, editor }: { containerWidth: number; editor: Editor | null }) => {
  const { foldedIds, showMore } = getFoldedState(containerWidth);

  return (
    <div className="tiptap-top-toolbar flex items-center !p-1 gap-1 flex-nowrap overflow-hidden !border-b !border-solid !border-border w-full min-w-0">
      <div className="flex items-center gap-1 min-w-0 overflow-hidden flex-nowrap">
        {!foldedIds.has('undo') && <RichTextUndo />}
        {!foldedIds.has('redo') && <RichTextRedo />}
        {!foldedIds.has('clear') && <RichTextClear />}
        {!foldedIds.has('heading') && <HeadingSelect editor={editor} />}
        {!foldedIds.has('bold') && <RichTextBold />}
        {!foldedIds.has('italic') && <RichTextItalic />}
        {!foldedIds.has('underline') && <RichTextUnderline />}
        {!foldedIds.has('strike') && <RichTextStrike />}
        {!foldedIds.has('color') && <RichTextColor />}
        {!foldedIds.has('highlight') && <RichTextHighlight />}
        {!foldedIds.has('bulletList') && <RichTextBulletList />}
        {!foldedIds.has('orderedList') && <RichTextOrderedList />}
        {!foldedIds.has('taskList') && <RichTextTaskList />}
        {!foldedIds.has('moreMark') && <RichTextMoreMark />}
        {!foldedIds.has('code') && <RichTextCode />}
        {!foldedIds.has('horizontalRule') && <RichTextHorizontalRule />}
        {!foldedIds.has('blockquote') && <RichTextBlockquote />}
        {!foldedIds.has('align') && <RichTextAlign />}
        {!foldedIds.has('link') && <RichTextLink />}
        {!foldedIds.has('image') && <RichTextImage />}
        {!foldedIds.has('table') && <RichTextTable />}
        {!foldedIds.has('codeBlock') && <RichTextCodeBlock />}
      </div>

      {showMore && (
        <div className="shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-xs flex items-center justify-center cursor-pointer">
                <MoreHorizontal className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="reactjs-tiptap-popover-menu !w-auto max-w-[280px] min-w-[42px] p-1.5 flex flex-wrap items-center gap-1 max-h-[320px] overflow-y-auto z-50">
              {foldedIds.has('undo') && <RichTextUndo />}
              {foldedIds.has('redo') && <RichTextRedo />}
              {foldedIds.has('clear') && <RichTextClear />}
              {foldedIds.has('heading') && <HeadingSelect editor={editor} />}
              {foldedIds.has('bold') && <RichTextBold />}
              {foldedIds.has('italic') && <RichTextItalic />}
              {foldedIds.has('underline') && <RichTextUnderline />}
              {foldedIds.has('strike') && <RichTextStrike />}
              {foldedIds.has('color') && <RichTextColor />}
              {foldedIds.has('highlight') && <RichTextHighlight />}
              {foldedIds.has('bulletList') && <RichTextBulletList />}
              {foldedIds.has('orderedList') && <RichTextOrderedList />}
              {foldedIds.has('taskList') && <RichTextTaskList />}
              {foldedIds.has('moreMark') && <RichTextMoreMark />}
              {foldedIds.has('code') && <RichTextCode />}
              {foldedIds.has('horizontalRule') && <RichTextHorizontalRule />}
              {foldedIds.has('blockquote') && <RichTextBlockquote />}
              {foldedIds.has('align') && <RichTextAlign />}
              {foldedIds.has('link') && <RichTextLink />}
              {foldedIds.has('image') && <RichTextImage />}
              {foldedIds.has('table') && <RichTextTable />}
              {foldedIds.has('codeBlock') && <RichTextCodeBlock />}
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
};

export interface ReactjsTiptapEditorProps {
  initialContent?: string;
  content?: string;
  onChange?: (html: string) => void;
  editable?: boolean;
  className?: string;
}

export function ReactjsTiptapEditor({
  initialContent,
  content: valueProp,
  onChange,
  editable = true,
  className = '',
}: ReactjsTiptapEditorProps) {
  const [internalContent, setInternalContent] = useState(valueProp ?? initialContent ?? DEFAULT);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    localeActions.setLang('zh_CN');
  }, []);

  const onValueChange = useCallback(
    debounce((value: any) => {
      if (valueProp === undefined) {
        setInternalContent(value);
      }
      onChange?.(value);
    }, 300),
    [valueProp, onChange],
  );

  const editor = useEditor({
    textDirection: 'auto',
    content: valueProp !== undefined ? valueProp : internalContent,
    extensions,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onValueChange(html);
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  useEffect(() => {
    if (editor && initialContent !== undefined) {
      const currentHTML = editor.getHTML();
      if (currentHTML !== initialContent) {
        editor.commands.setContent(initialContent);
      }
    }
  }, [editor, initialContent]);

  return (
    <div ref={containerRef} className={`reactjs-tiptap-editor-wrapper flex flex-col h-full w-full flex-1 min-h-0 overflow-hidden rounded-[0.5rem] bg-background !border !border-border ${className}`}>
      {editor && (
        <RichTextProvider editor={editor}>
          <RichTextToolbar containerWidth={containerWidth} editor={editor} />

          <EditorContent editor={editor} className="flex flex-col flex-1 h-full min-h-0 w-full overflow-hidden" />

          {/* Bubble */}
          <RichTextBubbleLink />
          <RichTextBubbleImage />
          <RichTextBubbleTable />
          <RichTextBubbleText />
          <RichTextBubbleCodeBlock />
          <RichTextBubbleMenuDragHandle />
        </RichTextProvider>
      )}
    </div>
  );
}

export default ReactjsTiptapEditor;
