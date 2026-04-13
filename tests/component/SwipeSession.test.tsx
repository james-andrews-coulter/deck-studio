import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwipeSession } from '@/components/SwipeSession';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState(
    (s) => ({ ...s, decks: {}, lists: {} }),
    true as unknown as false,
  );

// Stabilize the shuffle so queue order is predictable across clicks.
beforeEach(() => {
  reset();
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SwipeSession', () => {
  const seedListWithThree = () => {
    const deckId = useAppStore.getState().addDeck({
      name: 'D',
      fieldMapping: { title: 't' },
      cards: [
        { id: 'c1', fields: { t: 'Alpha' } },
        { id: 'c2', fields: { t: 'Beta' } },
        { id: 'c3', fields: { t: 'Gamma' } },
      ],
    });
    return useAppStore.getState().createList(deckId, 'L');
  };

  it('discard marks the card hidden in the store and advances', async () => {
    const user = userEvent.setup();
    const listId = seedListWithThree();

    render(<SwipeSession listId={listId} onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: /^discard$/i }));

    const hiddenCount = useAppStore
      .getState()
      .lists[listId].cardRefs.filter((r) => r.hidden).length;
    expect(hiddenCount).toBe(1);
  });

  it('keep does not mutate hidden flags', async () => {
    const user = userEvent.setup();
    const listId = seedListWithThree();

    render(<SwipeSession listId={listId} onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: /^keep$/i }));

    const hiddenCount = useAppStore
      .getState()
      .lists[listId].cardRefs.filter((r) => r.hidden).length;
    expect(hiddenCount).toBe(0);
  });

  it('undo reverses a prior discard (unhides the card)', async () => {
    const user = userEvent.setup();
    const listId = seedListWithThree();

    render(<SwipeSession listId={listId} onDone={() => {}} />);
    await user.click(screen.getByRole('button', { name: /^discard$/i }));
    expect(
      useAppStore.getState().lists[listId].cardRefs.filter((r) => r.hidden).length,
    ).toBe(1);
    await user.click(screen.getByRole('button', { name: /^undo$/i }));
    expect(
      useAppStore.getState().lists[listId].cardRefs.filter((r) => r.hidden).length,
    ).toBe(0);
  });

  it('undo is disabled when the stack is empty', () => {
    const listId = seedListWithThree();
    render(<SwipeSession listId={listId} onDone={() => {}} />);
    expect(screen.getByRole('button', { name: /^undo$/i })).toBeDisabled();
  });

  it('shows summary and calls onDone after every card is reviewed', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    const listId = seedListWithThree();

    render(<SwipeSession listId={listId} onDone={onDone} />);
    // three cards; keep all
    await user.click(screen.getByRole('button', { name: /^keep$/i }));
    await user.click(screen.getByRole('button', { name: /^keep$/i }));
    await user.click(screen.getByRole('button', { name: /^keep$/i }));

    expect(screen.getByRole('heading', { name: /all done/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /back to list/i }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});

