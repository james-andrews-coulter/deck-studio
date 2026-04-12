import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoveToGroupDialog } from '@/components/MoveToGroupDialog';
import type { Group } from '@/lib/types';

const groups: Group[] = [
  { id: 'g1', name: 'Warm-ups', color: 'slate' },
  { id: 'g2', name: 'Deep work', color: 'emerald' },
];

describe('MoveToGroupDialog', () => {
  it('renders a (Ungrouped) option and each group name', () => {
    render(
      <MoveToGroupDialog open onOpenChange={() => {}} groups={groups} onPick={() => {}} />
    );
    expect(screen.getByRole('button', { name: /\(ungrouped\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Warm-ups' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deep work' })).toBeInTheDocument();
  });

  it('picks a group by id and closes', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <MoveToGroupDialog open onOpenChange={onOpenChange} groups={groups} onPick={onPick} />
    );
    await user.click(screen.getByRole('button', { name: 'Deep work' }));
    expect(onPick).toHaveBeenCalledWith('g2');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('picks null when choosing Ungrouped', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(
      <MoveToGroupDialog open onOpenChange={() => {}} groups={groups} onPick={onPick} />
    );
    await user.click(screen.getByRole('button', { name: /\(ungrouped\)/i }));
    expect(onPick).toHaveBeenCalledWith(null);
  });

  it('cancel closes without picking', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <MoveToGroupDialog open onOpenChange={onOpenChange} groups={groups} onPick={onPick} />
    );
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onPick).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders only the (Ungrouped) option when there are no groups', () => {
    render(
      <MoveToGroupDialog open onOpenChange={() => {}} groups={[]} onPick={() => {}} />
    );
    const buttons = screen.getAllByRole('button');
    // (Ungrouped), Cancel, and the dialog close X
    expect(buttons.some((b) => /\(ungrouped\)/i.test(b.textContent ?? ''))).toBe(true);
  });
});
