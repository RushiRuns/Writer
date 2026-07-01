import * as fs from 'fs/promises';
import * as path from 'path';
import { NoteEntry, VaultIndex, DrawingEntry } from '../../shared/ipc-types';
import { parseFrontmatter } from './frontmatter';

// Helper to recursively list all files in a folder
export async function walkFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const item of list) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...(await walkFiles(fullPath)));
      } else {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`Failed to walk directory: ${dir}`, err);
  }
  return files;
}

// Helper to recursively collect relative paths of all subdirectories that belong
// to the notes section (top-level dirs that are NOT reserved section names).
const RESERVED_SECTION_DIRS = new Set([
  'inbox', 'later', 'read', 'shop', 'watch', 'tasks', 'journal', 'archive', 'attachments'
]);

export async function walkNoteFolders(vaultRoot: string): Promise<string[]> {
  const result: string[] = [];

  async function walk(absDir: string, relDir: string) {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const childRel = relDir ? `${relDir}/${entry.name}` : entry.name;
      // Skip reserved top-level section directories
      if (!relDir && RESERVED_SECTION_DIRS.has(entry.name.toLowerCase())) continue;
      // Skip hidden directories
      if (entry.name.startsWith('.')) continue;
      result.push(childRel);
      await walk(path.join(absDir, entry.name), childRel);
    }
  }

  await walk(vaultRoot, '');
  return result;
}

// Word count calculation helper (pure logic)
export function countWords(text: string): number {
  const clean = text.trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}

// Inline tag extraction helper (pure logic)
export function extractInlineTags(text: string): string[] {
  // Matches #tagname (letters, numbers, hyphens, underscores) ending at word boundary or space
  const matches = text.matchAll(/#([a-zA-Z0-9_-]+)/g);
  const tags = new Set<string>();
  for (const match of matches) {
    tags.add(match[1].toLowerCase());
  }
  return Array.from(tags);
}

// Outgoing wiki links extraction helper (pure logic)
export function extractWikiLinks(text: string): string[] {
  const matches = text.matchAll(/\[\[([^\]]+)\]\]/g);
  const links = new Set<string>();
  for (const match of matches) {
    links.add(match[1].trim());
  }
  return Array.from(links);
}

// Maps relative vault path to its logical section
export function getSectionFromPath(vaultRelativePath: string): NoteEntry['section'] {
  const parts = vaultRelativePath.replace(/\\/g, '/').split('/');
  const rootFolder = parts[0]?.toLowerCase();
  
  switch (rootFolder) {
    case 'inbox': return 'inbox';
    case 'later': return 'later';
    case 'read': return 'read';
    case 'shop': return 'shop';
    case 'watch': return 'watch';
    case 'tasks': return 'tasks';
    case 'journal': return 'journal';
    case 'archive': return 'archive';
    default: return 'notes';
  }
}

// Process a single markdown note file
export async function processNoteFile(absolutePath: string, vaultRoot: string): Promise<NoteEntry> {
  const fileContent = await fs.readFile(absolutePath, 'utf8');
  const stats = await fs.stat(absolutePath);
  const relativePath = path.relative(vaultRoot, absolutePath);
  
  const { content, data } = parseFrontmatter(fileContent);
  const inlineTags = extractInlineTags(content);
  const frontmatterTags = Array.isArray(data.tags) ? data.tags.map((t: any) => String(t).toLowerCase()) : [];
  const mergedTags = Array.from(new Set([...inlineTags, ...frontmatterTags]));

  const title = data.title || path.parse(absolutePath).name;
  const wordCount = countWords(content);
  const wikiLinks = extractWikiLinks(content);
  
  // Format dates cleanly
  const modified = stats.mtime.toISOString();
  const created = data.created || stats.birthtime.toISOString();
 
  // Preview content (strip styling/newlines)
  const preview = content
    .replace(/[\n\r]+/g, ' ')
    .trim()
    .slice(0, 120);
 
  return {
    path: absolutePath,
    title,
    folder: path.dirname(relativePath),
    section: getSectionFromPath(relativePath),
    tags: mergedTags,
    reminder: data.reminder
      ? (data.reminder instanceof Date
          ? (!isNaN(data.reminder.getTime()) ? data.reminder.toISOString() : null)
          : String(data.reminder))
      : null,
    completed: !!data.completed,
    completedAt: data.completed_at || null,
    preview,
    created,
    modified,
    wordCount,
    links: wikiLinks
  };
}

// Process batches of files concurrently in chunks of 50
export async function processBatch<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

// Rebuilds the entire vault index in-memory
export async function buildVaultIndex(vaultRoot: string): Promise<VaultIndex> {
  const [allFiles, noteFolders] = await Promise.all([
    walkFiles(vaultRoot),
    walkNoteFolders(vaultRoot)
  ]);
  
  // Filter markdown notes
  const noteFiles = allFiles.filter(f => f.endsWith('.md'));
  
  // Process all notes in chunks of 50
  const notes = await processBatch(noteFiles, 50, (filePath) => 
    processNoteFile(filePath, vaultRoot)
  );

  // Group drawings from /Attachments folder
  const drawings: DrawingEntry[] = allFiles
    .filter(f => f.includes('Attachments') && f.endsWith('.png'))
    .map(pngPath => {
      const name = path.parse(pngPath).name;
      const jsonPath = path.join(path.dirname(pngPath), `${name}.json`);
      return { name, pngPath, jsonPath };
    });

  // Build tags map
  const tagMap: Record<string, string[]> = {};
  for (const note of notes) {
    for (const tag of note.tags) {
      if (!tagMap[tag]) {
        tagMap[tag] = [];
      }
      tagMap[tag].push(note.path);
    }
  }

  // Filter reminders
  const reminders = notes.filter(n => n.reminder !== null);

  return {
    notes,
    tagMap,
    drawings,
    reminders,
    folders: noteFolders
  };
}
