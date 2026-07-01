import { Blockquote } from '@tiptap/extension-blockquote';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CalloutView } from './CalloutView';

export const CustomBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      type: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const match = element.className?.match(/callout-(\w+)/);
          return match ? match[1] : null;
        },
        renderHTML: (attributes: Record<string, any>) => {
          if (!attributes.type) return {};
          return { class: `callout-block callout-${attributes.type}` };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  // Custom markdown parsing
  parseMarkdown: (token: any, helpers: any) => {
    const content = helpers.parseChildren(token.tokens || []);
    let type: string | null = null;
    
    // Inspect the first child to find alert type like [!NOTE]
    if (content && content[0] && content[0].type === 'paragraph' && content[0].content) {
      const firstTextNode = content[0].content[0];
      if (firstTextNode && firstTextNode.type === 'text' && typeof firstTextNode.text === 'string') {
        const match = firstTextNode.text.match(/^\[!(NOTE|WARNING|TIP|IMPORTANT|CAUTION)\]\s*(.*)/i);
        if (match) {
          type = match[1].toLowerCase();
          const restText = match[2];
          if (restText) {
            firstTextNode.text = restText;
          } else {
            // Remove the [!NOTE] prefix token from paragraph content array
            content[0].content.shift();
          }
        }
      }
    }
    
    return {
      type: 'blockquote',
      attrs: { type },
      content,
    };
  },

  // Custom markdown rendering
  renderMarkdown: (node: any, helpers: any) => {
    const type = node.attrs.type;
    const innerContent = helpers.renderChildren(node);
    
    if (type) {
      const prefix = `[!${type.toUpperCase()}]`;
      // Prepend [!TYPE] to the markdown blockquote content
      return `> ${prefix}\n${innerContent.split('\n').map((line: string) => `> ${line}`).join('\n')}\n\n`;
    }
    
    return `> ${innerContent.split('\n').map((line: string) => `> ${line}`).join('\n')}\n\n`;
  }
} as any);
