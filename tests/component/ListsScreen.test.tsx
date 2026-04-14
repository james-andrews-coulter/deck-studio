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

describe('ListsScreen — new list dialog with exercise picker', () => {
  beforeEach(() => {
    reset();
  });

  const renderScreen = () =>
    render(
      <MemoryRouter initialEntries={['/lists']}>
        <Routes>
          <Route path="/lists" element={<ListsScreen />} />
          <Route path="/lists/:id" element={<div>List page</div>} />
        </Routes>
      </MemoryRouter>,
    );

  const seedDeckWithExercises = () =>
    useAppStore.getState().addDeck({
      name: 'Pocket Muse',
      fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'A' } }],
      exercises: [
        {
          id: 'priority',
          name: 'Priority Planner',
          instructions: '',
          groups: ['Week', 'Month', 'Year'],
        },
        {
          id: 'triage',
          name: 'Triage',
          instructions: '',
          groups: ['Keep', 'Park'],
        },
      ],
    });

  it('exercise picker is absent when the deck has no exercises', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D',
      fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'A' } }],
    });
    renderScreen();
    await user.click(screen.getByRole('button', { name: /\+ new list/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: /deck/i }), [deckId]);
    expect(screen.queryByRole('combobox', { name: /exercise/i })).not.toBeInTheDocument();
  });

  it('picking an exercise auto-fills the name and shows the groups preview', async () => {
    const user = userEvent.setup();
    const deckId = seedDeckWithExercises();
    renderScreen();
    await user.click(screen.getByRole('button', { name: /\+ new list/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: /deck/i }), [deckId]);
    await user.selectOptions(
      screen.getByRole('combobox', { name: /exercise/i }),
      ['priority'],
    );
    expect(screen.getByPlaceholderText(/shortlist/i)).toHaveValue('Priority Planner');
    expect(screen.getByText(/Seeds 3 groups: Week · Month · Year/)).toBeInTheDocument();
  });

  it('does not overwrite a custom-typed name when an exercise is picked', async () => {
    const user = userEvent.setup();
    const deckId = seedDeckWithExercises();
    renderScreen();
    await user.click(screen.getByRole('button', { name: /\+ new list/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: /deck/i }), [deckId]);
    await user.type(screen.getByPlaceholderText(/shortlist/i), 'My plan');
    await user.selectOptions(
      screen.getByRole('combobox', { name: /exercise/i }),
      ['priority'],
    );
    expect(screen.getByPlaceholderText(/shortlist/i)).toHaveValue('My plan');
  });

  it('renders the exercise name on list rows with a bound exercise', () => {
    const deckId = seedDeckWithExercises();
    useAppStore.getState().createList(deckId, 'Bound', 'priority');
    useAppStore.getState().createList(deckId, 'Plain');
    renderScreen();
    const boundRow = screen.getByText('Bound').closest('a')!;
    expect(boundRow).toHaveTextContent('Priority Planner');
    const plainRow = screen.getByText('Plain').closest('a')!;
    expect(plainRow).not.toHaveTextContent('Priority Planner');
    expect(plainRow).not.toHaveTextContent('Triage');
  });

  it('does not render a badge when the exerciseId is unresolved', () => {
    const deckId = seedDeckWithExercises();
    useAppStore.getState().createList(deckId, 'Orphaned', 'priority');
    // simulate the exercise being removed on re-import
    useAppStore.setState((s) => ({
      decks: { ...s.decks, [deckId]: { ...s.decks[deckId], exercises: [] } },
    }));
    renderScreen();
    const row = screen.getByText('Orphaned').closest('a')!;
    expect(row).not.toHaveTextContent('Priority Planner');
  });

  it('creating with an exercise sets exerciseId on the resulting list', async () => {
    const user = userEvent.setup();
    const deckId = seedDeckWithExercises();
    renderScreen();
    await user.click(screen.getByRole('button', { name: /\+ new list/i }));
    await user.selectOptions(screen.getByRole('combobox', { name: /deck/i }), [deckId]);
    await user.selectOptions(
      screen.getByRole('combobox', { name: /exercise/i }),
      ['triage'],
    );
    await user.click(screen.getByRole('button', { name: /^create$/i }));
    const lists = Object.values(useAppStore.getState().lists);
    expect(lists).toHaveLength(1);
    expect(lists[0].exerciseId).toBe('triage');
    expect(lists[0].groups.map((g) => g.name)).toEqual(['Keep', 'Park']);
  });
});
