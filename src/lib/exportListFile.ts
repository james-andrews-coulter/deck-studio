import { toast } from 'sonner';
import type { Deck, List } from './types';
import { exportListToMarkdown } from './markdownExporter';
import { downloadTextFile } from './download';

/**
 * Export a list to markdown and trigger a download. Surfaces a toast on
 * failure so callers can wire this up from menus without their own
 * try/catch wrapper.
 */
export function exportListFile(list: List, deck: Deck): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const md = exportListToMarkdown(list, deck, today);
    const slug = slugify(list.name);
    downloadTextFile(`${slug}-${today}.md`, md);
  } catch {
    toast.error("Couldn't start download.");
  }
}

function slugify(name: string): string {
  const cleaned = name
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return cleaned || 'list';
}
