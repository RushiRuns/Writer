import { Extension } from '@tiptap/core';
import { Suggestion } from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { PluginKey } from '@tiptap/pm/state';
import tippy from 'tippy.js';
import { CommandList } from './CommandList';

export const WikiLinkAutocomplete = Extension.create({
  name: 'wikiLinkAutocomplete',

  addOptions() {
    return {
      notes: [] as any[],
      suggestion: {
        char: '[',
        findSuggestionMatch: ({ $position }: any) => {
          const textBefore = $position.parent.textBetween(
            Math.max(0, $position.parentOffset - 100),
            $position.parentOffset,
            null,
            '\0'
          );
          const match = /\[\[([^\]]*)$/.exec(textBefore);
          if (match) {
            const from = $position.pos - match[0].length;
            const to = $position.pos;
            return {
              range: { from, to },
              query: match[1],
              text: match[0],
            };
          }
          return null;
        },
        items: ({ query, editor }: any) => {
          const notesList = editor.extensionManager.extensions.find(
            (e: any) => e.name === 'wikiLinkAutocomplete'
          )?.options.notes || [];

          return notesList
            .filter((n: any) => n.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 8)
            .map((n: any) => ({
              title: n.title,
              description: n.folder === '.' ? 'root' : n.folder,
              command: ({ editor, range }: any) => {
                editor
                  .chain()
                  .focus()
                  .deleteRange(range)
                  .insertContent(`<span data-wikilink="true" data-title="${n.title}">${n.title}</span> `)
                  .run();
              },
            }));
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
        pluginKey: new PluginKey('wikiLinkAutocompleteSuggestion'),
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
