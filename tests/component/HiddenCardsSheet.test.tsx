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
});
