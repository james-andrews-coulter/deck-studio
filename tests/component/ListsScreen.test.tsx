import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ListsScreen from '@/screens/ListsScreen';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState(
    (s) => ({ ...s, decks: {}, lists: {} }),
    true as unknown as false
  );

describe('ListsScreen', () => {
  beforeEach(() => {
    reset();
  });

  it('shows empty state when no lists', () => {
    render(
      <MemoryRouter initialEntries={['/lists']}>
        <Routes>
          <Route path="/lists" element={<ListsScreen />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/No lists yet/i)).toBeInTheDocument();
  });

  it('wizard creates a list from a deck', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D',
      fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'A' } }],
    });
    render(
      <MemoryRouter initialEntries={['/lists']}>
        <Routes>
          <Route path="/lists" element={<ListsScreen />} />
          <Route path="/lists/:id" element={<div>List page</div>} />
        </Routes>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: /\+ new list/i }));
    await user.selectOptions(screen.getByRole('combobox'), [deckId]);
    await user.type(screen.getByPlaceholderText(/shortlist/i), 'My');
    await user.click(screen.getByRole('button', { name: /^create$/i }));
    expect(screen.getByText(/List page/i)).toBeInTheDocument();
  });
});
