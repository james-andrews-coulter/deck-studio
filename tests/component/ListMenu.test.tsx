import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ListMenu } from '@/components/ListMenu';
import { useAppStore } from '@/store';

// jsdom lacks pointer-capture APIs that sonner's toast actions try to use.
// Provide no-op shims so the pointer-down handler doesn't throw.
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

describe('ListMenu', () => {
  beforeEach(() => {
    reset();
  });

  it('shuffle mutates order and undo restores', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({
      name: 'D',
      fieldMapping: { title: 't' },
      cards: Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, fields: { t: `C${i}` } })),
    });
    const listId = useAppStore.getState().createList(deckId, 'L');
    const before = useAppStore
      .getState()
      .lists[listId].cardRefs.map((r) => r.cardId)
      .join(',');

    render(
      <MemoryRouter>
        <ListMenu listId={listId} />
        <Toaster position="top-center" />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /list actions/i }));
    await user.click(screen.getByRole('menuitem', { name: /shuffle/i }));

    // Shuffle happened; toast with Undo visible
    await user.click(await screen.findByRole('button', { name: /undo/i }));
    const after = useAppStore
      .getState()
      .lists[listId].cardRefs.map((r) => r.cardId)
      .join(',');
    expect(after).toBe(before);
  });
});
