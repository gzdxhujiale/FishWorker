import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { convertMarkdownToTipTapJson } from '../jsonMarkdownAdapter';

function isMarkdownText(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  // Check if text has markdown block structure or inline markdown indicators
  const mdBlockRegex = /^(#{1,6}\s|>|\s*[-*+]\s|\s*\d+\.\s|\s*-\s*\[[ xX]\]|```|---|[*]{3}|_{3})/m;
  const mdInlineRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`|\[.+\]\(.+\))/;
  return mdBlockRegex.test(text) || mdInlineRegex.test(text);
}

export const PasteMarkdownExtension = Extension.create({
  name: 'pasteMarkdownExtension',

  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      new Plugin({
        key: new PluginKey('pasteMarkdownExtension'),
        props: {
          handlePaste(_view, event) {
            const text = event.clipboardData?.getData('text/plain');
            if (!text) return false;

            // If the pasted text contains markdown syntax, convert it automatically
            if (isMarkdownText(text)) {
              try {
                const jsonStr = convertMarkdownToTipTapJson(text);
                const json = JSON.parse(jsonStr);
                if (json && Array.isArray(json.content) && json.content.length > 0) {
                  editor.commands.insertContent(json.content);
                  return true; // Prevent default plain text paste
                }
              } catch (e) {
                console.warn('Failed to insert pasted markdown content:', e);
              }
            }

            return false; // Fallback to standard paste
          },
        },
      }),
    ];
  },
});
