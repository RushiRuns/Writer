import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate, EditorView } from '@codemirror/view';

// Decoration to hide characters
const hideMark = Decoration.mark({ class: 'cm-hidden-syntax' });

// Decoration to style WikiLinks as pills
const wikiLinkPillMark = Decoration.mark({ class: 'cm-wikilink-pill' });

export const hideMarkdownPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.getDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = this.getDecorations(update.view);
      }
    }

    getDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const { state } = view;
      
      // Get current cursor line number
      const cursorHead = state.selection.main.head;
      const cursorLine = state.doc.lineAt(cursorHead).number;

      // Scan visible viewport ranges
      for (const { from, to } of view.visibleRanges) {
        // Build styling range set in ascending order
        const text = state.sliceDoc(from, to);
        let match;
        
        // Match WikiLinks: [[note-title]]
        const wikiRegex = /\[\[([a-zA-Z0-9_\-\s]+)\]\]/g;
        const wikiMatches: Array<{ start: number; end: number; contentStart: number; contentEnd: number }> = [];
        
        while ((match = wikiRegex.exec(text)) !== null) {
          const matchStart = from + match.index;
          const matchEnd = matchStart + match[0].length;
          wikiMatches.push({
            start: matchStart,
            end: matchEnd,
            contentStart: matchStart + 2,
            contentEnd: matchEnd - 2
          });
        }

        syntaxTree(state).iterate({
          from,
          to,
          enter(node) {
            const isSyntaxMark = [
              'HeaderMark',
              'EmphasisMark',
              'StrongMark',
              'StrikethroughMark',
              'ListMark',
              'LinkMark'
            ].includes(node.name);

            if (isSyntaxMark) {
              const nodeLine = state.doc.lineAt(node.from).number;
              if (nodeLine !== cursorLine) {
                // If it is inside a WikiLink match range, don't double decorate
                const insideWiki = wikiMatches.some(w => node.from >= w.start && node.to <= w.end);
                if (!insideWiki) {
                  builder.add(node.from, node.to, hideMark);
                }
              }
            }
          }
        });

        // Add WikiLink decorations (brackets hiding + text pill styling) on idle lines
        wikiMatches.forEach((w) => {
          const nodeLine = state.doc.lineAt(w.start).number;
          if (nodeLine !== cursorLine) {
            builder.add(w.start, w.contentStart, hideMark);
            builder.add(w.contentStart, w.contentEnd, wikiLinkPillMark);
            builder.add(w.contentEnd, w.end, hideMark);
          }
        });
      }

      return builder.finish();
    }
  },
  {
    decorations: v => v.decorations
  }
);

// CSS theme extensions for CodeMirror
export const hideMarkdownStyles = EditorView.theme({
  '.cm-hidden-syntax': {
    display: 'none !important'
  },
  '.cm-wikilink-pill': {
    color: '#E8A44B !important',
    textDecoration: 'underline !important',
    fontWeight: '500 !important',
    cursor: 'pointer'
  }
});
