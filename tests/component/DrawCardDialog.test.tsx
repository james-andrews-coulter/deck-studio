import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DrawCardDialog } from '@/components/DrawCardDialog';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

describe('DrawCardDialog', () => {
  beforeEach(() => {
    reset();
  });

  it('shows a card from the visible set', () => {
    const deckId = useAppStore.getState().addDeck({
      name: 'D', fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'Alpha' } }],
    });
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().setDrawCardOpen(true);
    render(<DrawCardDialog listId={listId} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
