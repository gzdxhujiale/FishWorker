/**
 * Utility functions for converting between Markdown strings and TipTap JSON strings.
 */

// Parse inline text with bold (**), italic (*), strikethrough (~~), code (`), and links ([text](url))
function parseInlineText(text: string): any[] {
  if (!text) return [];
  const result: any[] = [];
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|~~.*?~~|`.*?`|\[.*?\]\(.*?\))/g);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      result.push({ type: 'text', text: part.slice(2, -2), marks: [{ type: 'bold' }] });
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      result.push({ type: 'text', text: part.slice(1, -1), marks: [{ type: 'italic' }] });
    } else if (part.startsWith('~~') && part.endsWith('~~') && part.length > 4) {
      result.push({ type: 'text', text: part.slice(2, -2), marks: [{ type: 'strike' }] });
    } else if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      result.push({ type: 'text', text: part.slice(1, -1), marks: [{ type: 'code' }] });
    } else if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        result.push({
          type: 'text',
          text: match[1],
          marks: [{ type: 'link', attrs: { href: match[2] } }]
        });
      } else {
        result.push({ type: 'text', text: part });
      }
    } else {
      result.push({ type: 'text', text: part });
    }
  }

  return result.length > 0 ? result : [{ type: 'text', text }];
}

/**
 * Convert Markdown or plain text into a TipTap JSON string.
 */
export function convertMarkdownToTipTapJson(markdownStr: string): string {
  if (!markdownStr) return JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
  const trimmed = markdownStr.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      JSON.parse(trimmed);
      return trimmed; // Already valid JSON string
    } catch {
      // Fallback parse as markdown
    }
  }

  const lines = markdownStr.split('\n');
  const nodes: any[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeBlockLines = [];
      } else {
        inCodeBlock = false;
        nodes.push({
          type: 'codeBlock',
          attrs: { language: codeLang },
          content: codeBlockLines.length > 0 ? [{ type: 'text', text: codeBlockLines.join('\n') }] : []
        });
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    const trimmedLine = line.trim();
    if (trimmedLine === '') {
      nodes.push({ type: 'paragraph' });
      continue;
    }

    if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
      nodes.push({ type: 'horizontalRule' });
      continue;
    }

    if (line.startsWith('# ')) {
      nodes.push({ type: 'heading', attrs: { level: 1 }, content: parseInlineText(line.slice(2)) });
    } else if (line.startsWith('## ')) {
      nodes.push({ type: 'heading', attrs: { level: 2 }, content: parseInlineText(line.slice(3)) });
    } else if (line.startsWith('### ')) {
      nodes.push({ type: 'heading', attrs: { level: 3 }, content: parseInlineText(line.slice(4)) });
    } else if (line.startsWith('#### ')) {
      nodes.push({ type: 'heading', attrs: { level: 4 }, content: parseInlineText(line.slice(5)) });
    } else if (line.startsWith('##### ')) {
      nodes.push({ type: 'heading', attrs: { level: 5 }, content: parseInlineText(line.slice(6)) });
    } else if (line.startsWith('###### ')) {
      nodes.push({ type: 'heading', attrs: { level: 6 }, content: parseInlineText(line.slice(7)) });
    } else if (line.startsWith('> ')) {
      nodes.push({ type: 'blockquote', content: [{ type: 'paragraph', content: parseInlineText(line.slice(2)) }] });
    } else if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      const checked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
      nodes.push({
        type: 'taskList',
        content: [{
          type: 'taskItem',
          attrs: { checked },
          content: [{ type: 'paragraph', content: parseInlineText(line.slice(6)) }]
        }]
      });
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^\d+\.\s/);
      const textAfter = match ? line.slice(match[0].length) : line;
      nodes.push({
        type: 'orderedList',
        content: [{
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInlineText(textAfter) }]
        }]
      });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      nodes.push({
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{ type: 'paragraph', content: parseInlineText(line.slice(2)) }]
        }]
      });
    } else {
      nodes.push({ type: 'paragraph', content: parseInlineText(line) });
    }
  }

  return JSON.stringify({ type: 'doc', content: nodes.length > 0 ? nodes : [{ type: 'paragraph' }] });
}

/**
 * Convert a TipTap JSON string to a clean Markdown string.
 */
export function convertTipTapJsonToMarkdown(jsonStr: string): string {
  if (!jsonStr) return '';
  const trimmed = jsonStr.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return jsonStr;
  }

  try {
    const json = JSON.parse(trimmed);
    return renderNodeToMarkdown(json).trim();
  } catch {
    return jsonStr;
  }
}

function renderNodeToMarkdown(node: any): string {
  if (!node) return '';

  if (node.type === 'doc') {
    if (Array.isArray(node.content)) {
      return node.content.map(renderNodeToMarkdown).join('\n\n');
    }
    return '';
  }

  if (node.type === 'text') {
    let text = node.text || '';
    if (Array.isArray(node.marks)) {
      node.marks.forEach((mark: any) => {
        if (mark.type === 'bold') text = `**${text}**`;
        if (mark.type === 'italic') text = `*${text}*`;
        if (mark.type === 'strike') text = `~~${text}~~`;
        if (mark.type === 'code') text = `\`${text}\``;
        if (mark.type === 'link' && mark.attrs?.href) text = `[${text}](${mark.attrs.href})`;
      });
    }
    return text;
  }

  const childText = Array.isArray(node.content)
    ? node.content.map(renderNodeToMarkdown).join('')
    : '';

  switch (node.type) {
    case 'heading': {
      const level = node.attrs?.level || 1;
      const prefix = '#'.repeat(level);
      return `${prefix} ${childText}`;
    }
    case 'paragraph':
      return childText;
    case 'horizontalRule':
      return '---';
    case 'blockquote':
      return `> ${childText}`;
    case 'bulletList':
    case 'orderedList':
      return Array.isArray(node.content)
        ? node.content.map((item: any) => renderNodeToMarkdown(item)).join('\n')
        : childText;
    case 'listItem':
      return `- ${childText}`;
    case 'taskList':
      return Array.isArray(node.content)
        ? node.content.map((item: any) => renderNodeToMarkdown(item)).join('\n')
        : childText;
    case 'taskItem': {
      const checked = node.attrs?.checked ? 'x' : ' ';
      return `- [${checked}] ${childText}`;
    }
    case 'codeBlock': {
      const lang = node.attrs?.language || '';
      return `\`\`\`${lang}\n${childText}\n\`\`\``;
    }
    default:
      return childText;
  }
}
