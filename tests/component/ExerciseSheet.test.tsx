import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExerciseSheet } from '@/components/ExerciseSheet';
import { useAppStore } from '@/store';

const baseUi = {
  collapsedGroups: {},
  hiddenSheetOpen: false,
  activeDeckDetail: null,
  exerciseSheetOpenByListId: {},
};

function setup(hasExerciseOnDeck: boolean) {
  useAppStore.setState({ decks: {}, lists: {}, ui: { ...baseUi } });
  const deckId = useAppStore.getState().addDeck({
    name: 'D',
    fieldMapping: { title: 't' },
    cards: [{ id: 'c1', fields: { t: 'x' } }],
    ...(hasExerciseOnDeck
      ? {
          exercises: [
            {
              id: 'priority',
              name: 'Priority Planner',
              instructions: 'Sort **fast**.\n\n- short\n- long',
              groups: ['A', 'B'],
            },
          ],
        }
      : {}),
  });
  const listId = useAppStore
    .getState()
    .createList(deckId, 'L', hasExerciseOnDeck ? 'priority' : undefined);
  return { listId };
}

describe('ExerciseSheet', () => {
  beforeEach(() => {
    useAppStore.setState({ decks: {}, lists: {}, ui: { ...baseUi } });
  });

  it('renders nothing when list has no exerciseId', () => {
    const { listId } = setup(false);
    const { container } = render(<ExerciseSheet listId={listId} />);
    expect(container.textContent).toBe('');
  });

  it('opens via store state and renders instructions + template', async () => {
    const { listId } = setup(true);
    useAppStore.getState().setExerciseSheetOpen(listId, true);
    render(<ExerciseSheet listId={listId} />);
    expect(await screen.findByText('Priority Planner')).toBeInTheDocument();
    expect(screen.getByText('short')).toBeInTheDocument();
    expect(screen.getByText('long')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('shows template labels even after list groups are renamed', async () => {
    const { listId } = setup(true);
    const list = useAppStore.getState().lists[listId];
    useAppStore.getState().renameGroup(listId, list.groups[0].id, 'CUSTOM');
    useAppStore.getState().setExerciseSheetOpen(listId, true);
    render(<ExerciseSheet listId={listId} />);
    expect(await screen.findByText('A')).toBeInTheDocument();
  });

  it('closes via the close button', async () => {
    const { listId } = setup(true);
    useAppStore.getState().setExerciseSheetOpen(listId, true);
    render(<ExerciseSheet listId={listId} />);
    const user = userEvent.setup();
    const closeBtns = await screen.findAllByRole('button', { name: /close/i });
    await user.click(closeBtns[0]);
    expect(useAppStore.getState().ui.exerciseSheetOpenByListId[listId]).toBe(false);
  });
});
