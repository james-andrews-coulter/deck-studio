import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectionActionBar } from '@/components/SelectionActionBar';

const noop = () => {};

describe('SelectionActionBar', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(
      <SelectionActionBar count={0} onClear={noop} onNewGroup={noop} onMoveTo={noop} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows the selected count', () => {
    render(<SelectionActionBar count={3} onClear={noop} onNewGroup={noop} onMoveTo={noop} />);
    expect(screen.getByText(/3 selected/i)).toBeInTheDocument();
  });

  it('hides the New group button when fewer than 2 selected', () => {
    render(<SelectionActionBar count={1} onClear={noop} onNewGroup={noop} onMoveTo={noop} />);
    expect(screen.queryByRole('button', { name: /new group/i })).not.toBeInTheDocument();
  });

  it('shows the New group button when 2 or more selected', () => {
    render(<SelectionActionBar count={2} onClear={noop} onNewGroup={noop} onMoveTo={noop} />);
    expect(screen.getByRole('button', { name: /new group/i })).toBeInTheDocument();
  });

  it('invokes the right callback for each button', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const onNewGroup = vi.fn();
    const onMoveTo = vi.fn();
    render(
      <SelectionActionBar
        count={3}
        onClear={onClear}
        onNewGroup={onNewGroup}
        onMoveTo={onMoveTo}
      />
    );
    await user.click(screen.getByRole('button', { name: /clear/i }));
    await user.click(screen.getByRole('button', { name: /new group/i }));
    await user.click(screen.getByRole('button', { name: /move to/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onNewGroup).toHaveBeenCalledTimes(1);
    expect(onMoveTo).toHaveBeenCalledTimes(1);
  });
});
