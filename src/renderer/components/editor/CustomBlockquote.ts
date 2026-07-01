// Custom Blockquote Extension for Callout blocks
import { Blockquote } from '@tiptap/extension-blockquote';
import { ReactNodeViewRenderer } from '@tiptap/react';
import CalloutView from './CalloutView';

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
            // If the next token is a softbreak, remove it too to prevent leading newlines
            if (content[0].content[0] && content[0].content[0].type === 'softbreak') {
              content[0].content.shift();
            }
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
    if (!node.content) {
      return "";
    }
    const type = node.attrs.type;
    const prefix = ">";
    const result: string[] = [];
    
    node.content.forEach((child: any, index: number) => {
      let childContent = helpers.renderChild?.(child, index) ?? helpers.renderChildren([child]);
      
      // If this is the first child and we have a callout type, prepend [!TYPE]
      if (index === 0 && type) {
        childContent = `[!${type.toUpperCase()}]\n${childContent}`;
      }
      
      const lines = childContent.split("\n");
      const linesWithPrefix = lines.map((line: string) => {
        if (line.trim() === "") {
          return prefix;
        }
        return `${prefix} ${line}`;
      });
      result.push(linesWithPrefix.join("\n"));
    });
    
    return result.join(`\n${prefix}\n`);
  }
} as any);
