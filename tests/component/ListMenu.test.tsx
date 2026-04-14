import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ListMenu } from '@/components/ListMenu';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

describe('ListMenu', () => {
  beforeEach(() => {
    reset();
  });

  it('opens and shows list actions', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D',
      fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'A' } }],
    });
    const listId = useAppStore.getState().createList(deckId, 'L');

    render(
      <MemoryRouter>
        <ListMenu listId={listId} />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /list actions/i }));
    expect(screen.getByRole('menuitem', { name: /export as markdown/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /clear all groups/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /delete list/i })).toBeInTheDocument();
  });
});
