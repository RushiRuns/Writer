import { Mark, markInputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface WikiLinkOptions {
  onClick?: (title: string) => void;
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (attributes: { title: string }) => ReturnType;
      toggleWikiLink: (attributes: { title: string }) => ReturnType;
      unsetWikiLink: () => ReturnType;
    }
  }
}

export const wikiLinkTokenizer = {
  name: 'wikiLink',
  level: 'inline' as const,
  start: (src: string) => src.indexOf('[['),
  tokenize(src: string) {
    const match = src.match(/^\[\[([^\]\n]+)\]\]/);
    if (match) {
      return {
        type: 'wikiLink',
        raw: match[0],
        text: match[1],
      };
    }
  },
};

export const WikiLink = Mark.create<WikiLinkOptions>({
  name: 'wikiLink',

  markdownTokenizer: wikiLinkTokenizer,

  addOptions() {
    return {
      onClick: undefined,
      HTMLAttributes: {
        'data-wikilink': 'true',
        class: 'cm-wikilink-pill',
        style: 'cursor: pointer; text-decoration: underline; color: var(--color-brand-amber, #e8a44b); font-weight: 500;',
      },
    };
  },

  addAttributes() {
    return {
      title: {
        default: null,
        parseHTML: element => element.getAttribute('data-title') || element.textContent,
        renderHTML: attributes => ({
          'data-title': attributes.title,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wikilink]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', { ...this.options.HTMLAttributes, ...HTMLAttributes }, 0];
  },

  parseMarkdown(token: any, helpers: any) {
    return {
      mark: 'wikiLink',
      attrs: {
        title: token.text,
      },
      content: [
        {
          type: 'text',
          text: token.text,
        },
      ],
    };
  },

  renderMarkdown(node: any, helpers: any) {
    return `[[${helpers.renderChildren(node.content || [])}]]`;
  },

  addCommands() {
    return {
      setWikiLink: attributes => ({ commands }) => {
        return commands.setMark(this.name, attributes);
      },
      toggleWikiLink: attributes => ({ commands }) => {
        return commands.toggleMark(this.name, attributes);
      },
      unsetWikiLink: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
    };
  },

  addInputRules() {
    return [
      markInputRule({
        find: /\[\[([^\]]+)\]\]$/,
        type: this.type,
        getAttributes: match => ({
          title: match[1],
        }),
      }),
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('wikiLinkClick'),
        props: {
          handleClick: (view, pos, event) => {
            const target = event.target as HTMLElement;
            const wikiSpan = target.closest('span[data-wikilink]');
            if (wikiSpan) {
              const noteTitle = wikiSpan.getAttribute('data-title') || wikiSpan.textContent?.trim();
              if (noteTitle && this.options.onClick) {
                this.options.onClick(noteTitle);
              }
              return true; // prevent default behavior
            }
            return false;
          },
        },
      }),
    ];
  },
});
