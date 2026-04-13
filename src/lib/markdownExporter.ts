import type { Deck, List } from './types';
import { resolveCard } from './cardFields';

/**
 * Escape the markdown characters most likely to break surrounding
 * emphasis, link, or code-span syntax when a user-supplied string is
 * embedded inside `**...**` or `*...*`. Kept narrow (no hyphens, no
 * hashes) so common punctuation in titles/group names doesn't gain
 * spurious backslashes.
 */
function escapeMd(value: string): string {
  return value.replace(/([\\`*_[\]])/g, '\\$1');
}

/**
 * Indent every continuation line of a multi-line body with two spaces so
 * it stays under its bullet in the rendered markdown.
 */
function indentBody(body: string): string {
  return body.split('\n').join('\n  ');
}

export function exportListToMarkdown(list: List, deck: Deck, today: string): string {
  const cardById = new Map(deck.cards.map((c) => [c.id, c]));
  const visibleRefs = list.cardRefs.filter((r) => !r.hidden && cardById.has(r.cardId));

  const lines: string[] = [];
  lines.push(`# ${escapeMd(list.name)}`);
  lines.push('');
  lines.push(`> From deck: *${escapeMd(deck.name)}* · ${today}`);
  lines.push('');

  if (visibleRefs.length === 0) {
    lines.push('*No cards yet*');
    return lines.join('\n') + '\n';
  }

  const renderCard = (cardId: string) => {
    const card = cardById.get(cardId)!;
    const r = resolveCard(card, deck.fieldMapping);
    const out = [`- **${escapeMd(r.title)}**`];
    if (r.body) out.push(`  ${indentBody(escapeMd(r.body))}`);
    return out.join('\n');
  };

  for (const group of list.groups) {
    const refs = visibleRefs.filter((r) => r.groupId === group.id);
    if (!refs.length) continue;
    lines.push(`## ${escapeMd(group.name)}`);
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
