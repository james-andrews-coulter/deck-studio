import type { Deck, List } from './types';
import { resolveCard } from './cardFields';

export function exportListToMarkdown(list: List, deck: Deck, today: string): string {
  const cardById = new Map(deck.cards.map((c) => [c.id, c]));
  const visibleRefs = list.cardRefs.filter((r) => !r.hidden && cardById.has(r.cardId));

  const lines: string[] = [];
  lines.push(`# ${list.name}`);
  lines.push('');
  lines.push(`> From deck: *${deck.name}* · ${today}`);
  lines.push('');

  if (visibleRefs.length === 0) {
    lines.push('*No cards yet*');
    return lines.join('\n') + '\n';
  }

  const renderCard = (cardId: string) => {
    const card = cardById.get(cardId)!;
    const r = resolveCard(card, deck.fieldMapping);
    const out = [`- **${r.title}**`];
    if (r.body) out.push(`  ${r.body}`);
    return out.join('\n');
  };

  for (const group of list.groups) {
    const refs = visibleRefs.filter((r) => r.groupId === group.id);
    if (!refs.length) continue;
    lines.push(`## ${group.name}`);
    for (const r of refs) lines.push(renderCard(r.cardId));
    lines.push('');
  }

  const ungrouped = visibleRefs.filter((r) => r.groupId === null);
  if (ungrouped.length) {
    lines.push('## (Ungrouped)');
    for (const r of ungrouped) lines.push(renderCard(r.cardId));
    lines.push('');
  }

  return lines.join('\n');
}
