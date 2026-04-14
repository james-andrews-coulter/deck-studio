import { useEffect, useMemo, useState } from 'react';
import { SkipForward } from 'lucide-react';
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
  const setProcessed = useAppStore((s) => s.setProcessed);

  const filterSignature = useMemo(
    () =>
      Object.entries(metaFilters)
        .filter(([, s]) => s.size > 0)
        .map(([k, s]) => `${k}:${Array.from(s).sort().join(',')}`)
        .sort()
        .join('|'),
    [metaFilters],
  );

  // Rebuild the queue whenever scope / filters change. Unprocessed (no keep/
  // discard flag) + unhidden + in-scope + matches filters. Frozen at session
  // start — we don't want the queue to shrink visibly as the user processes.
  const initialQueue = useMemo(
    () => {
      if (!list || !deck) return [];
      return shuffle(
        list.cardRefs
          .filter((r) => {
            if (r.hidden) return false;
            if (r.processed) return false;
            if (scopeGroupId !== undefined && r.groupId !== scopeGroupId) return false;
            if (scopeGroupId === undefined && r.groupId !== null) return false;
            const card = deck.cards.find((c) => c.id === r.cardId);
            if (!card) return false;
            return cardMatchesFilters(card, metaFilters);
          })
          .map((r) => r.cardId),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listId, filterSignature, scopeGroupId],
  );

  // Session-local queue that supports skip (rotate current to back).
  const [queue, setQueue] = useState<string[]>(initialQueue);
  const [processedCount, setProcessedCount] = useState(0);
  const [undoStack, setUndoStack] = useState<
    Array<{ cardId: string; direction: 'keep' | 'discard' }>
  >([]);

  useEffect(() => {
    setQueue(initialQueue);
    setProcessedCount(0);
    setUndoStack([]);
  }, [initialQueue]);

  if (!list || !deck) return null;

  if (initialQueue.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No unprocessed cards in this scope.
        </p>
        <Button onClick={onDone}>Back to list</Button>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <h3 className="text-xl font-semibold">All done</h3>
        <Button onClick={onDone}>Back to list</Button>
      </div>
    );
  }

  const cardId = queue[0];
  const card = deck.cards.find((c) => c.id === cardId);

  const commit = (dir: 'keep' | 'discard') => {
    setProcessed(listId, cardId, dir);
    if (dir === 'discard') setHidden(listId, cardId, true);
    setUndoStack((s) => [...s, { cardId, direction: dir }]);
    setQueue((q) => q.slice(1));
    setProcessedCount((n) => n + 1);
  };

  const skip = () => {
    // Session-local: rotate the current card to the back. No persistent flag.
    setQueue((q) => (q.length < 2 ? q : [...q.slice(1), q[0]]));
  };

  const undo = () => {
    const last = undoStack[undoStack.length - 1];
    if (!last) return;
    if (last.direction === 'discard') setHidden(listId, last.cardId, false);
    setProcessed(listId, last.cardId, undefined);
    setUndoStack((s) => s.slice(0, -1));
    setQueue((q) => [last.cardId, ...q]);
    setProcessedCount((n) => Math.max(0, n - 1));
  };

  if (!card) return null;

  const remaining = queue.length;
  const total = processedCount + remaining;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {processedCount + 1} / {total}
      </div>
      <SwipeCard
        key={`${cardId}-${processedCount}`}
        card={card}
        mapping={deck.fieldMapping}
        onCommit={commit}
      />
      <div className="flex shrink-0 flex-wrap justify-center gap-2">
        <Button variant="outline" onClick={() => commit('discard')}>
          Discard
        </Button>
        <Button variant="outline" onClick={skip} disabled={queue.length < 2}>
          <SkipForward className="mr-1 h-4 w-4" aria-hidden />
          Skip
        </Button>
        <Button variant="outline" onClick={undo} disabled={!undoStack.length}>
          Undo
        </Button>
        <Button onClick={() => commit('keep')}>Keep</Button>
      </div>
    </div>
  );
}
