import { useEffect, useRef } from 'react';

export function useAutoSave(
  content: string,
  onSave: (currentContent: string) => void,
  delayMs = 2000
) {
  const savedContentRef = useRef(content);
  const onSaveRef = useRef(onSave);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync references to avoid breaking useEffect dependencies
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    // Keep reference updated when parent updates selection or resets content
    if (content === savedContentRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSaveRef.current(content);
      savedContentRef.current = content;
    }, delayMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [content, delayMs]);

  const forceSave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (content !== savedContentRef.current) {
      onSaveRef.current(content);
      savedContentRef.current = content;
    }
  };

  const resetSavedRef = (newContent: string) => {
    savedContentRef.current = newContent;
  };

  return { forceSave, resetSavedRef };
}
