import { describe, it, expect } from 'vitest';
import { parseFrontmatter, stringifyFrontmatter } from './frontmatter';

describe('frontmatter parser', () => {
  it('should parse valid frontmatter and content', () => {
    const fileContent = `---
title: My First Note
tags: [tag1, tag2]
completed: false
---
Hello World`;
    const result = parseFrontmatter(fileContent);
    expect(result.content).toBe('Hello World');
    expect(result.data.title).toBe('My First Note');
    expect(result.data.tags).toEqual(['tag1', 'tag2']);
    expect(result.data.completed).toBe(false);
  });

  it('should handle missing frontmatter gracefully', () => {
    const fileContent = 'Just content without frontmatter';
    const result = parseFrontmatter(fileContent);
    expect(result.content).toBe('Just content without frontmatter');
    expect(result.data).toEqual({});
  });

  it('should handle malformed frontmatter gracefully', () => {
    const fileContent = `---
malformed yaml: [unclosed brackets
---
Hello`;
    const result = parseFrontmatter(fileContent);
    expect(result.content).toBe(fileContent);
    expect(result.data).toEqual({});
  });
});

describe('frontmatter stringifier', () => {
  it('should stringify content and frontmatter data correctly', () => {
    const body = 'Hello World';
    const data = { title: 'Test Note', tags: ['a', 'b'] };
    const result = stringifyFrontmatter(body, data);
    expect(result).toContain('title: Test Note');
    expect(result).toContain('Hello World');
  });
});
