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

  it('renders the deck name and card count when opened', () => {
    const id = seedDeck();
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();
    expect(screen.getByRole('button', { name: 'Prompts' })).toBeInTheDocument();
    expect(screen.getByText(/2 cards/i)).toBeInTheDocument();
  });

  it('pluralizes card label correctly for a single-card deck', () => {
    const id = useAppStore.getState().addDeck({
      name: 'Solo',
      fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'Only' } }],
    });
    useAppStore.getState().setDeckDetail(id);
    renderWithRouter();
    expect(screen.getByText(/^1 card$/i)).toBeInTheDocument();
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
});
