import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectionActionBar } from '@/components/SelectionActionBar';

const noop = () => {};

describe('SelectionActionBar', () => {
  it('renders the All and Clear buttons even when no cards are selected', () => {
    render(
      <SelectionActionBar
        count={0}
        onClear={noop}
        onSelectAll={noop}
        onNewGroup={noop}
        onMoveTo={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^clear$/i })).toBeDisabled();
  });

  it('hides the New group button when fewer than 2 selected', () => {
    render(
      <SelectionActionBar
        count={1}
        onClear={noop}
        onSelectAll={noop}
        onNewGroup={noop}
        onMoveTo={noop}
      />,
    );
    expect(screen.queryByRole('button', { name: /new group/i })).not.toBeInTheDocument();
  });

  it('shows the New group button when 2 or more selected', () => {
    render(
      <SelectionActionBar
        count={2}
        onClear={noop}
        onSelectAll={noop}
        onNewGroup={noop}
        onMoveTo={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /new group/i })).toBeInTheDocument();
  });

  it('invokes the right callback for each button', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const onSelectAll = vi.fn();
    const onNewGroup = vi.fn();
    const onMoveTo = vi.fn();
    render(
      <SelectionActionBar
        count={3}
        onClear={onClear}
        onSelectAll={onSelectAll}
        onNewGroup={onNewGroup}
        onMoveTo={onMoveTo}
      />,
    );
    await user.click(screen.getByRole('button', { name: /^all$/i }));
    await user.click(screen.getByRole('button', { name: /^clear$/i }));
    await user.click(screen.getByRole('button', { name: /new group/i }));
    await user.click(screen.getByRole('button', { name: /move to/i }));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onNewGroup).toHaveBeenCalledTimes(1);
    expect(onMoveTo).toHaveBeenCalledTimes(1);
  });
});
