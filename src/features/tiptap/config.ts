import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import GlobalDragHandle from 'tiptap-extension-global-drag-handle';

interface TiptapConfigOptions {
  enableDragHandle?: boolean;
  enableMarkdown?: boolean;
}

export const getTiptapExtensions = (options: TiptapConfigOptions = {}) => {
  const { enableDragHandle = true, enableMarkdown = true } = options;
  
  const extensions: any[] = [
    StarterKit.configure({}),
    Underline.configure({}),
    TaskList.configure({}),
    TaskItem.configure({ nested: true }),
    TextStyle.configure({}),
    Color.configure({}),
    Highlight.configure({ multicolor: true }),
  ];

  if (enableMarkdown) {
    extensions.push(Markdown);
  }

  if (enableDragHandle) {
    extensions.push(GlobalDragHandle.configure({
      dragHandleWidth: 20,
      scrollTreshold: 100,
    }));
  }

  return extensions;
};
