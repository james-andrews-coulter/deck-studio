import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListScreen from '@/screens/ListScreen';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

describe('ListScreen', () => {
  beforeEach(() => {
    reset();
  });

  it('renders visible cards and opens detail sheet on tap', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D', fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'Alpha' } }, { id: 'c2', fields: { t: 'Beta' } }],
    });
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().setHidden(listId, 'c2', true);

    render(
      <MemoryRouter initialEntries={[`/lists/${listId}`]}>
        <Routes>
          <Route path="/lists/:listId" element={<ListScreen />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();

    // After Task 13, list items are wrapped with dnd-kit's useSortable which
    // spreads role="button" on the <li>. Click the inner <button> (type="button") explicitly.
    const alphaButton = screen.getAllByRole('button', { name: /Alpha/i }).find((el) => el.tagName === 'BUTTON');
    if (!alphaButton) throw new Error('Alpha button not found');
    await user.click(alphaButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
