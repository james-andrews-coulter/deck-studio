import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExercisePeekStrip } from '@/components/ExercisePeekStrip';
import { useAppStore } from '@/store';

const baseUi = {
  collapsedGroups: {},
  hiddenSheetOpen: false,
  activeDeckDetail: null,
  exerciseSheetOpenByListId: {},
};

function setup(hasExercise: boolean) {
  useAppStore.setState({ decks: {}, lists: {}, ui: { ...baseUi } });
  const deckId = useAppStore.getState().addDeck({
    name: 'D',
    fieldMapping: { title: 't' },
    cards: [{ id: 'c1', fields: { t: 'x' } }],
    ...(hasExercise
      ? {
          exercises: [
            { id: 'priority', name: 'Priority Planner', instructions: '', groups: ['A'] },
          ],
        }
      : {}),
  });
  const listId = useAppStore
    .getState()
    .createList(deckId, 'L', hasExercise ? 'priority' : undefined);
  return { listId };
}

describe('ExercisePeekStrip', () => {
  beforeEach(() => {
    useAppStore.setState({ decks: {}, lists: {}, ui: { ...baseUi } });
  });

  it('renders nothing when list has no exerciseId', () => {
    const { listId } = setup(false);
    const { container } = render(<ExercisePeekStrip listId={listId} />);
    expect(container.textContent).toBe('');
  });

  it('renders the exercise name and opens the sheet on click', async () => {
    const { listId } = setup(true);
    render(<ExercisePeekStrip listId={listId} />);
    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: /priority planner/i });
    await user.click(btn);
    expect(useAppStore.getState().ui.exerciseSheetOpenByListId[listId]).toBe(true);
  });

  it('renders nothing when exerciseId is unresolved', () => {
    const { listId } = setup(true);
    const list = useAppStore.getState().lists[listId];
    useAppStore.setState((s) => ({
      decks: {
        ...s.decks,
        [list.deckId]: { ...s.decks[list.deckId], exercises: [] },
      },
    }));
    const { container } = render(<ExercisePeekStrip listId={listId} />);
    expect(container.textContent).toBe('');
  });
});
