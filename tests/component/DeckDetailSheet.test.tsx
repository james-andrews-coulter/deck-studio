import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DeckDetailSheet } from '@/components/DeckDetailSheet';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState(
    (s) => ({ ...s, decks: {}, lists: {}, ui: { ...s.ui, activeDeckDetail: null } }),
    true as unknown as false,
  );

const seedDeck = () =>
  useAppStore.getState().addDeck({
    name: 'Prompts',
    fieldMapping: { title: 't' },
    cards: [
      { id: 'c1', fields: { t: 'Alpha' } },
      { id: 'c2', fields: { t: 'Beta' } },
    ],
  });

const renderWithRouter = (initialPath = '/decks') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/decks" element={<DeckDetailSheet />} />
        <Route path="/decks/:deckId/configure" element={<div>Configure</div>} />
        <Route path="/lists/:listId" element={<div>List page</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('DeckDetailSheet', () => {
  beforeEach(() => {
    reset();
  });

  it('renders nothing when no deck is active', () => {
    renderWithRouter();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the deck name when opened', () => {
    const id = seedDeck();
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();
    expect(screen.getByRole('button', { name: 'Prompts' })).toBeInTheDocument();
  });

  it('renames the deck via the inline heading', async () => {
    const user = userEvent.setup();
    const id = seedDeck();
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();

    await user.click(screen.getByRole('button', { name: 'Prompts' }));
    // InlineRenameHeading swaps its button for an input with value="Prompts";
    // the "List name" input has no value so disambiguate by that.
    const renameInput = screen.getAllByRole('textbox').find(
      (el) => (el as HTMLInputElement).value === 'Prompts',
    ) as HTMLInputElement;
    await user.clear(renameInput);
    await user.type(renameInput, 'Renamed Deck{Enter}');
    expect(useAppStore.getState().decks[id].name).toBe('Renamed Deck');
  });

  it('create list: creates a new list with the entered name and navigates', async () => {
    const user = userEvent.setup();
    const id = seedDeck();
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();

    await user.type(screen.getByPlaceholderText(/list name/i), 'My List');
    await user.click(screen.getByRole('button', { name: /create list/i }));
    expect(screen.getByText(/list page/i)).toBeInTheDocument();
    const lists = Object.values(useAppStore.getState().lists);
    expect(lists).toHaveLength(1);
    expect(lists[0].name).toBe('My List');
  });

  it('shows referencing-list count in delete confirmation', async () => {
    const user = userEvent.setup();
    const id = seedDeck();
    useAppStore.getState().createList(id, 'Derived');
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();

    await user.click(screen.getByRole('button', { name: /^delete deck$/i }));
    expect(screen.getByText(/1 list references/i)).toBeInTheDocument();
  });

  it('delete removes the deck and closes the sheet (lists survive)', async () => {
    const user = userEvent.setup();
    const id = seedDeck();
    const listId = useAppStore.getState().createList(id, 'Derived');
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();

    await user.click(screen.getByRole('button', { name: /^delete deck$/i }));
    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    expect(useAppStore.getState().decks[id]).toBeUndefined();
    // Lists intentionally survive deck deletion
    expect(useAppStore.getState().lists[listId]).toBeDefined();
    expect(useAppStore.getState().ui.activeDeckDetail).toBeNull();
  });

  it('re-configure mapping navigates to the configure route', async () => {
    const user = userEvent.setup();
    const id = seedDeck();
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();

    await user.click(screen.getByRole('button', { name: /^re-configure mapping$/i }));
    expect(screen.getByText('Configure')).toBeInTheDocument();
  });

  it('does not render exercise chip or picker when the deck has no exercises', () => {
    const id = seedDeck();
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();
    expect(screen.queryByText(/exercise/i)).not.toBeInTheDocument();
  });
});

describe('DeckDetailSheet — with exercises', () => {
  beforeEach(() => {
    reset();
  });

  const seedDeckWithExercises = () =>
    useAppStore.getState().addDeck({
      name: 'Prompts',
      fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'Alpha' } }],
      exercises: [
        { id: 'triage', name: 'Triage', instructions: '', groups: ['Keep', 'Park'] },
        { id: 'priority', name: 'Priority', instructions: '', groups: ['A', 'B', 'C'] },
      ],
    });

  it('shows the exercise count chip', () => {
    const id = seedDeckWithExercises();
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();
    expect(screen.getByText(/2 exercises/i)).toBeInTheDocument();
  });

  it('auto-fills the list name when an exercise is picked', async () => {
    const user = userEvent.setup();
    const id = seedDeckWithExercises();
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();
    const picker = screen.getByRole('combobox', { name: /exercise/i });
    await user.selectOptions(picker, ['priority']);
    const nameInput = screen.getByPlaceholderText(/list name/i) as HTMLInputElement;
    expect(nameInput).toHaveValue('Priority');
    expect(screen.getByText(/Seeds 3 groups: A · B · C/)).toBeInTheDocument();
  });

  it('creates a list with the picked exercise id', async () => {
    const user = userEvent.setup();
    const id = seedDeckWithExercises();
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();
    await user.selectOptions(
      screen.getByRole('combobox', { name: /exercise/i }),
      ['triage'],
    );
    await user.click(screen.getByRole('button', { name: /create list/i }));
    const lists = Object.values(useAppStore.getState().lists);
    expect(lists).toHaveLength(1);
    expect(lists[0].exerciseId).toBe('triage');
    expect(lists[0].groups.map((g) => g.name)).toEqual(['Keep', 'Park']);
  });
});
