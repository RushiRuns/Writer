import { describe, it, expect, vi } from 'vitest';
import { 
  countWords, 
  extractInlineTags, 
  getSectionFromPath, 
  processBatch 
} from './index-builder';

describe('index builder helpers', () => {
  describe('countWords', () => {
    it('should return 0 for empty strings', () => {
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });

    it('should count words correctly', () => {
      expect(countWords('hello world')).toBe(2);
      expect(countWords('one   two three')).toBe(3);
    });
  });

  describe('extractInlineTags', () => {
    it('should extract tags starting with #', () => {
      expect(extractInlineTags('This is a #tag')).toEqual(['tag']);
      expect(extractInlineTags('Multiple #tags in #one text.')).toEqual(['tags', 'one']);
    });

    it('should handle case insensitivity', () => {
      expect(extractInlineTags('Mix of #Tag and #tag')).toEqual(['tag']);
    });

    it('should ignore hashes not starting a tag word', () => {
      expect(extractInlineTags('This is just #')).toEqual([]);
      expect(extractInlineTags('Hex code #fff')).toEqual(['fff']);
    });
  });

  describe('getSectionFromPath', () => {
    it('should map relative paths to correct sections', () => {
      expect(getSectionFromPath('Inbox/note1.md')).toBe('inbox');
      expect(getSectionFromPath('Later/note2.md')).toBe('later');
      expect(getSectionFromPath('Random/note3.md')).toBe('notes');
      expect(getSectionFromPath('Journal/day1.md')).toBe('journal');
    });
  });

  describe('processBatch', () => {
    it('should process items in chunks concurrently', async () => {
      const items = [1, 2, 3, 4, 5];
      const fn = vi.fn().mockImplementation(async (x: number) => x * 2);
      
      const results = await processBatch(items, 2, fn);
      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(fn).toHaveBeenCalledTimes(5);
    });
  });
});
