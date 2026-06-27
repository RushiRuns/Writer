import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate, EditorView } from '@codemirror/view';

// Decoration to hide characters
const hideMark = Decoration.mark({ class: 'cm-hidden-syntax' });

// Decoration to style WikiLinks as pills
const wikiLinkPillMark = Decoration.mark({ class: 'cm-wikilink-pill' });
const linkTextMark = Decoration.mark({ class: 'cm-link-text-amber' });

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

      const decos: Array<{ from: number; to: number; deco: Decoration }> = [];
      const styledLines = new Set<number>();

      // Scan visible viewport ranges
      for (const { from, to } of view.visibleRanges) {
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
            // Style Headings & Code Blocks Line Layout
            if (node.name === 'ATXHeading1' || node.name === 'ATXHeading2') {
              const lineStart = state.doc.lineAt(node.from).from;
              if (!styledLines.has(lineStart)) {
                styledLines.add(lineStart);
                const className = node.name === 'ATXHeading1' ? 'cm-line-heading-1' : 'cm-line-heading-2';
                decos.push({ from: lineStart, to: lineStart, deco: Decoration.line({ class: className }) });
              }
            }

            if (node.name === 'FencedCode') {
              const startLine = state.doc.lineAt(node.from).number;
              const endLine = state.doc.lineAt(node.to).number;
              for (let l = startLine; l <= endLine; l++) {
                const line = state.doc.line(l);
                if (!styledLines.has(line.from)) {
                  styledLines.add(line.from);
                  let borderClass = 'cm-line-code-block';
                  if (l === startLine) {
                    borderClass += ' cm-code-start';
                  }
                  if (l === endLine) {
                    borderClass += ' cm-code-end';
                  }
                  decos.push({ from: line.from, to: line.from, deco: Decoration.line({ class: borderClass }) });
                }
              }
            }

            // Style LinkText
            if (node.name === 'LinkText') {
              decos.push({ from: node.from, to: node.to, deco: linkTextMark });
            }

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
                const insideWiki = wikiMatches.some(w => node.from >= w.start && node.to <= w.end);
                if (!insideWiki) {
                  decos.push({ from: node.from, to: node.to, deco: hideMark });
                }
              }
            }
          }
        });

        // Add WikiLink decorations (brackets hiding + text pill styling) on idle lines
        wikiMatches.forEach((w) => {
          const nodeLine = state.doc.lineAt(w.start).number;
          if (nodeLine !== cursorLine) {
            decos.push({ from: w.start, to: w.contentStart, deco: hideMark });
            decos.push({ from: w.contentStart, to: w.contentEnd, deco: wikiLinkPillMark });
            decos.push({ from: w.contentEnd, to: w.end, deco: hideMark });
          }
        });
      }

      // Sort decorations safely
      decos.sort((a, b) => {
        if (a.from !== b.from) return a.from - b.from;
        const aLen = a.to - a.from;
        const bLen = b.to - b.from;
        return aLen - bLen;
      });

      decos.forEach(({ from, to, deco }) => {
        builder.add(from, to, deco);
      });

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
    color: '#9ca3af !important',
    textDecoration: 'underline !important',
    fontWeight: '500 !important',
    cursor: 'pointer'
  },
  '.cm-link-text-amber': {
    color: '#9ca3af !important',
    textDecoration: 'underline !important',
    cursor: 'pointer'
  },
  '.cm-line-heading-1': {
    fontSize: '28px !important',
    fontWeight: '700 !important',
    color: '#FFFFFF !important',
    lineHeight: '1.3 !important',
    marginTop: '20px !important',
    marginBottom: '10px !important',
  },
  '.cm-line-heading-2': {
    fontSize: '20px !important',
    fontWeight: '700 !important',
    color: '#EFEFEF !important',
    lineHeight: '1.4 !important',
    marginTop: '16px !important',
    marginBottom: '8px !important',
  },
  '.cm-line-code-block': {
    fontFamily: 'var(--font-mono) !important',
    fontSize: '13px !important',
    backgroundColor: '#0D0D0D !important',
    color: '#D4D4D4 !important',
    paddingLeft: '16px !important',
    paddingRight: '16px !important',
    borderLeft: '2px solid var(--accent-primary) !important',
  },
  '.cm-code-start': {
    borderTopLeftRadius: '6px !important',
    borderTopRightRadius: '6px !important',
    paddingTop: '8px !important',
  },
  '.cm-code-end': {
    borderBottomLeftRadius: '6px !important',
    borderBottomRightRadius: '6px !important',
    paddingBottom: '8px !important',
  }
});
