import { useMemo, useState } from 'react';
import { SwipeCard } from './SwipeCard';
import { Button } from './ui/button';
import { useAppStore } from '@/store';
import { shuffle } from '@/lib/shuffle';
import { cardMatchesFilters } from '@/lib/metaFilters';

type Props = {
  listId: string;
  onDone: () => void;
  metaFilters?: Record<string, Set<string>>;
  /** If set, the queue is scoped to this group instead of all ungrouped cards. */
  scopeGroupId?: string;
};

export function SwipeSession({ listId, onDone, metaFilters = {}, scopeGroupId }: Props) {
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setHidden = useAppStore((s) => s.setHidden);

  // Signature captures filter selections so the queue rebuilds when the user
  // toggles chips mid-session (undo stack resets along with it).
  const filterSignature = useMemo(
    () =>
      Object.entries(metaFilters)
        .filter(([, s]) => s.size > 0)
        .map(([k, s]) => `${k}:${Array.from(s).sort().join(',')}`)
        .sort()
        .join('|'),
    [metaFilters],
  );

  const initialQueue = useMemo(
    () => {
      if (!list || !deck) return [];
      return shuffle(
        list.cardRefs
          .filter((r) => {
            if (r.hidden) return false;
            if (scopeGroupId !== undefined && r.groupId !== scopeGroupId) return false;
            const card = deck.cards.find((c) => c.id === r.cardId);
            if (!card) return false;
            return cardMatchesFilters(card, metaFilters);
          })
          .map((r) => r.cardId),
      );
    },
    // Freeze queue at session start (and when filters or scope change).
    // Intentionally do not depend on list.cardRefs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listId, filterSignature, scopeGroupId],
  );
  const [index, setIndex] = useState(0);
  const [undoStack, setUndoStack] = useState<
    Array<{ cardId: string; direction: 'keep' | 'discard' }>
  >([]);

  // Reset when filters change mid-session
  useMemo(() => {
    setIndex(0);
    setUndoStack([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSignature]);

  if (!list || !deck) return null;

  const total = initialQueue.length;
  const remaining = total - index;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No cards match the current filters.
        </p>
        <Button onClick={onDone}>Back to list</Button>
      </div>
    );
  }

  if (remaining <= 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <h3 className="text-xl font-semibold">All done</h3>
        <Button onClick={onDone}>Back to list</Button>
      </div>
    );
  }

  const cardId = initialQueue[index];
  const card = deck.cards.find((c) => c.id === cardId);

  const commit = (dir: 'keep' | 'discard') => {
    if (dir === 'discard') setHidden(listId, cardId, true);
    setUndoStack((s) => [...s, { cardId, direction: dir }]);
    setIndex((i) => i + 1);
  };

  const undo = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    if (last.direction === 'discard') setHidden(listId, last.cardId, false);
    setUndoStack((s) => s.slice(0, -1));
    setIndex((i) => i - 1);
  };

  if (!card) return null;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <SwipeCard
        key={`${cardId}-${index}`}
        card={card}
        mapping={deck.fieldMapping}
        onCommit={commit}
      />
      <div className="flex shrink-0 flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={() => commit('discard')}>
          Discard
        </Button>
        <Button variant="outline" onClick={undo} disabled={!undoStack.length}>
          Undo
        </Button>
        <Button onClick={() => commit('keep')}>Keep</Button>
      </div>
    </div>
  );
}
