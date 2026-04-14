import { useMemo, useState } from 'react';
import { SwipeCard } from './SwipeCard';
import { Button } from './ui/button';
import { useAppStore } from '@/store';
import { shuffle } from '@/lib/shuffle';

type Props = { listId: string; onDone: () => void };

export function SwipeSession({ listId, onDone }: Props) {
  const list = useAppStore((s) => s.lists[listId]);
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const setHidden = useAppStore((s) => s.setHidden);

  const initialQueue = useMemo(
    () =>
      list && deck
        ? shuffle(
            list.cardRefs
              .filter((r) => !r.hidden && deck.cards.some((c) => c.id === r.cardId))
              .map((r) => r.cardId),
          )
        : [],
    // Freeze queue at session start — intentionally do not depend on list.cardRefs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listId],
  );
  const [index, setIndex] = useState(0);
  const [undoStack, setUndoStack] = useState<
    Array<{ cardId: string; direction: 'keep' | 'discard' }>
  >([]);

  if (!list || !deck) return null;

  const total = initialQueue.length;
  const remaining = total - index;

  if (remaining <= 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-10 text-center">
        <h3 className="text-xl font-semibold">All done</h3>
        <Button onClick={onDone}>Back to list</Button>
      </div>
    );
  }

  const cardId = initialQueue[index];
  // initialQueue was filtered to only contain IDs that resolve in the deck, so
  // `card` is guaranteed to be present for any queue position. Fall back defensively.
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
