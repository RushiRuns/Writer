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
              group: 'Basic Blocks',
              iconName: 'heading1',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
              },
            },
            {
              title: 'Heading 2',
              description: 'Medium section heading',
              group: 'Basic Blocks',
              iconName: 'heading2',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
              },
            },
            {
              title: 'Heading 3',
              description: 'Small section heading',
              group: 'Basic Blocks',
              iconName: 'heading3',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
              },
            },
            {
              title: 'Paragraph',
              description: 'Convert to plain body text',
              group: 'Basic Blocks',
              iconName: 'paragraph',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setNode('paragraph').run();
              },
            },
            {
              title: 'Bullet List',
              description: 'Create a simple bulleted list',
              group: 'Basic Blocks',
              iconName: 'bulletList',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBulletList().run();
              },
            },
            {
              title: 'Numbered List',
              description: 'Create a list with numbering',
              group: 'Basic Blocks',
              iconName: 'orderedList',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleOrderedList().run();
              },
            },
            {
              title: 'Blockquote',
              description: 'Insert a standard blockquote',
              group: 'Basic Blocks',
              iconName: 'blockquote',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().run();
              },
            },
            {
              title: 'Divider',
              description: 'Insert a visual separator line',
              group: 'Basic Blocks',
              iconName: 'blockquote',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setHorizontalRule().run();
              },
            },
            {
              title: 'Table',
              description: 'Insert a 3x3 table grid',
              group: 'Advanced Blocks',
              iconName: 'table',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
              },
            },
            {
              title: 'Image',
              description: 'Upload image from computer',
              group: 'Advanced Blocks',
              iconName: 'image',
              command: async ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).run();
                try {
                  const res = await (window as any).wrriter.uploadImage();
                  if (res && res.success) {
                    editor.chain().focus().setImage({ src: res.path }).run();
                  }
                } catch (err) {
                  console.error('Image upload failed:', err);
                }
              },
            },
            {
              title: 'Task List (Todo)',
              description: 'Create checkable task items',
              group: 'Advanced Blocks',
              iconName: 'todo',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleTaskList().run();
              },
            },
            {
              title: 'Code Block',
              description: 'Code snippet with syntax highlights',
              group: 'Advanced Blocks',
              iconName: 'codeBlock',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
              },
            },
            {
              title: 'Callout (Note)',
              description: 'A blue note container',
              group: 'Advanced Blocks',
              iconName: 'callout',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().updateAttributes('blockquote', { type: 'note' }).run();
              },
            },
            {
              title: 'Callout (Warning)',
              description: 'An amber alert container',
              group: 'Advanced Blocks',
              iconName: 'callout',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().updateAttributes('blockquote', { type: 'warning' }).run();
              },
            },
            {
              title: 'Callout (Tip)',
              description: 'A green tip highlight container',
              group: 'Advanced Blocks',
              iconName: 'callout',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().updateAttributes('blockquote', { type: 'tip' }).run();
              },
            },
            {
              title: 'Callout (Important)',
              description: 'A red info flag container',
              group: 'Advanced Blocks',
              iconName: 'callout',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().updateAttributes('blockquote', { type: 'important' }).run();
              },
            },
            {
              title: 'Callout (Caution)',
              description: 'A yellow warning container',
              group: 'Advanced Blocks',
              iconName: 'callout',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBlockquote().updateAttributes('blockquote', { type: 'caution' }).run();
              },
            },
            {
              title: 'Bold',
              description: 'Apply bold formatting',
              group: 'Text Styles',
              iconName: 'bold',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleBold().run();
              },
            },
            {
              title: 'Italic',
              description: 'Apply italic formatting',
              group: 'Text Styles',
              iconName: 'italic',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleItalic().run();
              },
            },
            {
              title: 'Underline',
              description: 'Apply underline formatting',
              group: 'Text Styles',
              iconName: 'underline',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleUnderline().run();
              },
            },
            {
              title: 'Strikethrough',
              description: 'Apply strikethrough formatting',
              group: 'Text Styles',
              iconName: 'strike',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleStrike().run();
              },
            },
            {
              title: 'Inline Code',
              description: 'Inline code snippet',
              group: 'Text Styles',
              iconName: 'code',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleCode().run();
              },
            },
            {
              title: 'Highlight (Amber)',
              description: 'Highlight text in amber',
              group: 'Text Styles',
              iconName: 'highlight',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleHighlight({ color: '#e8a44b' }).run();
              },
            },
            {
              title: 'Highlight (Red)',
              description: 'Highlight text in red',
              group: 'Text Styles',
              iconName: 'highlight',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleHighlight({ color: '#ef4444' }).run();
              },
            },
            {
              title: 'Highlight (Green)',
              description: 'Highlight text in green',
              group: 'Text Styles',
              iconName: 'highlight',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).toggleHighlight({ color: '#10b981' }).run();
              },
            },
            {
              title: 'Text Color (Amber)',
              description: 'Apply amber color to text',
              group: 'Text Styles',
              iconName: 'color',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setColor('#e8a44b').run();
              },
            },
            {
              title: 'Text Color (Red)',
              description: 'Apply red color to text',
              group: 'Text Styles',
              iconName: 'color',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setColor('#ef4444').run();
              },
            },
            {
              title: 'Text Color (Green)',
              description: 'Apply green color to text',
              group: 'Text Styles',
              iconName: 'color',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).setColor('#10b981').run();
              },
            },
            {
              title: 'Clear Colors & Highlights',
              description: 'Reset text styling to default',
              group: 'Text Styles',
              iconName: 'color',
              command: ({ editor, range }: any) => {
                editor.chain().focus().deleteRange(range).unsetColor().unsetHighlight().run();
              },
            },
            {
              title: 'Date',
              description: 'Insert today\'s date',
              group: 'Utilities',
              iconName: 'date',
              command: ({ editor, range }: any) => {
                const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
                editor.chain().focus().deleteRange(range).insertContent(dateStr).run();
              },
            },
            {
              title: 'Time',
              description: 'Insert current time',
              group: 'Utilities',
              iconName: 'time',
              command: ({ editor, range }: any) => {
                const timeStr = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                editor.chain().focus().deleteRange(range).insertContent(timeStr).run();
              },
            },
            {
              title: 'Date & Time',
              description: 'Insert current date & time stamp',
              group: 'Utilities',
              iconName: 'datetime',
              command: ({ editor, range }: any) => {
                const dtStr = new Date().toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                editor.chain().focus().deleteRange(range).insertContent(dtStr).run();
              },
            },
          ].filter(item => {
            const search = (query || '').toLowerCase();
            return item.title.toLowerCase().startsWith(search);
          });
        },
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
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
