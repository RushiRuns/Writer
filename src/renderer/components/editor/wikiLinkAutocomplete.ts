import { CompletionContext, CompletionSource } from '@codemirror/autocomplete';
import { NoteEntry } from '../../../shared/ipc-types';

export function createWikiLinkAutocomplete(notes: NoteEntry[]): CompletionSource {
  return (context: CompletionContext) => {
    // Match anything starting with [[ and optional letters/digits/spaces
    const word = context.matchBefore(/\[\[[a-zA-Z0-9_\-\s]*$/);
    if (!word) return null;

    const query = word.text.slice(2).toLowerCase();
    
    // Fuzzy-like query match on note titles (excluding current selection or including all)
    const options = notes
      .filter(n => n.title.toLowerCase().includes(query))
      .slice(0, 8)
      .map(n => ({
        label: n.title,
        detail: n.folder === '.' ? 'root' : n.folder,
        type: 'file',
        apply: `${n.title}]]`
      }));

    return {
      from: word.from + 2, // Completion starts after '[['
      options
    };
  };
}
