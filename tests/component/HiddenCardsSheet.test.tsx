import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HiddenCardsSheet } from '@/components/HiddenCardsSheet';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {}, ui: { ...s.ui, hiddenSheetOpen: true } }), true as unknown as false);

describe('HiddenCardsSheet', () => {
  beforeEach(() => {
    reset();
  });

  it('lists hidden cards and restores one', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D', fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'Alpha' } }],
    });
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().setHidden(listId, 'c1', true);
    useAppStore.getState().setHiddenSheetOpen(true);

    render(<HiddenCardsSheet listId={listId} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /restore/i })[1]); // the per-row Restore
    expect(useAppStore.getState().lists[listId].cardRefs[0].hidden).toBe(false);
  });

  it('renders Missing card placeholder for hidden refs whose deck card is gone', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D', fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'Alpha' } }],
    });
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().setHidden(listId, 'c1', true);
    // Simulate the deck's card disappearing after re-import (e.g. removed upstream)
    useAppStore.setState(
      (s) => ({
        ...s,
        decks: { ...s.decks, [deckId]: { ...s.decks[deckId], cards: [] } },
      }),
      true as unknown as false,
    );
    useAppStore.getState().setHiddenSheetOpen(true);

    render(<HiddenCardsSheet listId={listId} />);
    expect(screen.getByText(/missing card/i)).toBeInTheDocument();
    // Count in header matches the single hidden ref
    expect(screen.getByText(/hidden cards \(1\)/i)).toBeInTheDocument();
    // Per-row Restore still works even when the card is missing
    await user.click(screen.getAllByRole('button', { name: /restore/i })[1]);
    expect(useAppStore.getState().lists[listId].cardRefs[0].hidden).toBe(false);
  });
});
