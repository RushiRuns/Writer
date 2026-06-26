import matter from 'gray-matter';

export interface ParsedFrontmatter {
  content: string;
  data: {
    title?: string;
    created?: string;
    tags?: string[];
    reminder?: string | null;
    completed?: boolean;
    completed_at?: string | null;
    type?: 'journal';
    [key: string]: any;
  };
}

export function parseFrontmatter(fileContent: string): ParsedFrontmatter {
  try {
    const result = matter(fileContent);
    return {
      content: result.content,
      data: result.data || {}
    };
  } catch (err) {
    // Graceful degradation for malformed YAML
    return {
      content: fileContent,
      data: {}
    };
  }
}

export function stringifyFrontmatter(bodyContent: string, data: Record<string, any>): string {
  try {
    // Preserve body formatting exactly as-is
    return matter.stringify(bodyContent, data);
  } catch (err) {
    return bodyContent;
  }
}
