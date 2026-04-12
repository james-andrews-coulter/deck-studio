import { describe, it, expect } from 'vitest';
import { exportListToMarkdown } from '@/lib/markdownExporter';
import type { Deck, List } from '@/lib/types';

const deck: Deck = {
  id: 'd1',
  name: 'Prompts',
  importedAt: '2026-04-01T00:00:00Z',
  fieldMapping: { title: 't', body: 'b' },
  cards: [
    { id: 'c1', fields: { t: 'Alpha', b: 'alpha body' } },
    { id: 'c2', fields: { t: 'Beta' } },
    { id: 'c3', fields: { t: 'Gamma', b: 'gamma body' } },
  ],
};

const baseList: List = {
  id: 'l1',
  name: 'My List',
  deckId: 'd1',
  createdAt: '2026-04-12T10:00:00Z',
  updatedAt: '2026-04-12T10:00:00Z',
  groups: [{ id: 'g1', name: 'Warm-ups', color: 'slate' }],
  cardRefs: [
    { cardId: 'c1', hidden: false, groupId: 'g1' },
    { cardId: 'c2', hidden: false, groupId: null },
    { cardId: 'c3', hidden: true, groupId: null },
  ],
};

describe('exportListToMarkdown', () => {
  it('renders list name as H1 with deck blockquote', () => {
    const md = exportListToMarkdown(baseList, deck, '2026-04-12');
    expect(md).toContain('# My List');
    expect(md).toContain('> From deck: *Prompts* · 2026-04-12');
  });

  it('renders groups as H2 in order', () => {
    const md = exportListToMarkdown(baseList, deck, '2026-04-12');
    expect(md).toContain('## Warm-ups');
    expect(md).toContain('## (Ungrouped)');
    expect(md.indexOf('## Warm-ups')).toBeLessThan(md.indexOf('## (Ungrouped)'));
  });

  it('renders titles bold and body on indented next line', () => {
    const md = exportListToMarkdown(baseList, deck, '2026-04-12');
    expect(md).toContain('- **Alpha**\n  alpha body');
  });

  it('omits body line when body is unmapped or empty', () => {
    const md = exportListToMarkdown(baseList, deck, '2026-04-12');
    expect(md).toContain('- **Beta**');
    expect(md).not.toMatch(/\*\*Beta\*\*\n {2}\S/);
  });

  it('excludes hidden cards', () => {
    const md = exportListToMarkdown(baseList, deck, '2026-04-12');
    expect(md).not.toContain('Gamma');
  });

  it('omits ungrouped section when it has no visible cards', () => {
    const list: List = {
      ...baseList,
      cardRefs: [{ cardId: 'c1', hidden: false, groupId: 'g1' }],
    };
    const md = exportListToMarkdown(list, deck, '2026-04-12');
    expect(md).not.toContain('## (Ungrouped)');
  });

  it('renders a No cards placeholder for an empty list', () => {
    const list: List = { ...baseList, cardRefs: [] };
    const md = exportListToMarkdown(list, deck, '2026-04-12');
    expect(md).toContain('*No cards yet*');
  });

  it('renders Missing card for unresolved refs and excludes them from output body', () => {
    const list: List = {
      ...baseList,
      cardRefs: [{ cardId: 'missing', hidden: false, groupId: null }],
    };
    const md = exportListToMarkdown(list, deck, '2026-04-12');
    expect(md).toContain('*No cards yet*');
  });
});
