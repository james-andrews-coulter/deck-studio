import 'fake-indexeddb/auto';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupHeader } from '@/components/GroupHeader';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState((s) => ({ ...s, decks: {}, lists: {} }), true as unknown as false);

beforeEach(() => {
  reset();
  vi.stubGlobal('confirm', () => true);
});

describe('GroupHeader', () => {
  it('renames on input blur', async () => {
    const user = userEvent.setup();
    const deckId = useAppStore.getState().addDeck({ name: 'D', fieldMapping: { title: 't' }, cards: [{ id: 'c1', fields: { t: 'A' } }] });
    const listId = useAppStore.getState().createList(deckId, 'L');
    useAppStore.getState().addGroup(listId, 'Starters');
    const group = useAppStore.getState().lists[listId].groups[0];

    render(<GroupHeader listId={listId} group={group} />);
    await user.click(screen.getByRole('button', { name: /Starters/i }));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Warm-ups{Enter}');
    expect(useAppStore.getState().lists[listId].groups[0].name).toBe('Warm-ups');
  });
});
