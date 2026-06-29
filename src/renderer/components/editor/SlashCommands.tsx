import { Extension } from '@tiptap/core';
import { Suggestion } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { PluginKey } from '@tiptap/pm/state';
import tippy from 'tippy.js';
import { CommandList } from './CommandList';

export const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: true,
        items: ({ query }: { query: string }) => {
          return [
            {
              title: 'Heading 1',
              description: 'Big section heading',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
              },
            },
            {
              title: 'Heading 2',
              description: 'Medium section heading',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
              },
            },
            {
              title: 'Heading 3',
              description: 'Small section heading',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
              },
            },
            {
              title: 'Paragraph',
              description: 'Convert to plain body text',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('paragraph').run();
              },
            },
            {
              title: 'Bullet List',
              description: 'Create a simple bulleted list',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
              },
            },
            {
              title: 'Numbered List',
              description: 'Create a list with numbering',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
              },
            },
            {
              title: 'Blockquote',
              description: 'Insert a quote section',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run();
              },
            },
            {
              title: 'Code Block',
              description: 'Code block with formatting',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
              },
            },
            {
              title: 'Bold',
              description: 'Apply bold formatting',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBold().run();
              },
            },
            {
              title: 'Italic',
              description: 'Apply italic formatting',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleItalic().run();
              },
            },
            {
              title: 'Underline',
              description: 'Apply underline formatting',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleUnderline().run();
              },
            },
            {
              title: 'Strikethrough',
              description: 'Apply strikethrough formatting',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleStrike().run();
              },
            },
            {
              title: 'Inline Code',
              description: 'Inline code snippet',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleCode().run();
              },
            },
            {
              title: 'Highlight (Amber)',
              description: 'Highlight text in amber',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleHighlight({ color: '#e8a44b' }).run();
              },
            },
            {
              title: 'Text Color (Amber)',
              description: 'Apply amber color to text',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setColor('#e8a44b').run();
              },
            },
            {
              title: 'Clear Text Color',
              description: 'Reset text to default color',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).unsetColor().run();
              },
            },
            {
              title: 'Align Left',
              description: 'Align text to the left',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setTextAlign('left').run();
              },
            },
            {
              title: 'Align Center',
              description: 'Center-align text',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setTextAlign('center').run();
              },
            },
            {
              title: 'Align Right',
              description: 'Align text to the right',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setTextAlign('right').run();
              },
            },
          ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
        },
        render: () => {
          let component: any;
          let popup: any;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(CommandList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
            },

            onUpdate(props: any) {
              component.updateProps(props);

              if (popup && popup[0]) {
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              }
            },

            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                if (popup && popup[0]) {
                  popup[0].hide();
                }
                return true;
              }

              return component.ref?.onKeyDown(props) || false;
            },

            onExit() {
              if (popup && popup[0]) {
                popup[0].destroy();
              }
              component.destroy();
            },
          };
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: new PluginKey('slashCommandsSuggestion'),
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
