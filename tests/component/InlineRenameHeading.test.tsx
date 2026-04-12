import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineRenameHeading } from '@/components/InlineRenameHeading';

describe('InlineRenameHeading', () => {
  it('renders as a button showing the current value', () => {
    render(<InlineRenameHeading value="My List" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'My List' })).toBeInTheDocument();
  });

  it('enters edit mode on click and shows an input', async () => {
    const user = userEvent.setup();
    render(<InlineRenameHeading value="My List" onChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'My List' }));
    expect(screen.getByRole('textbox')).toHaveValue('My List');
  });

  it('commits the trimmed draft on Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InlineRenameHeading value="Original" onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '  Renamed  {Enter}');
    expect(onChange).toHaveBeenCalledWith('Renamed');
    // Returns to button view
    expect(screen.getByRole('button', { name: 'Original' })).toBeInTheDocument();
  });

  it('commits the draft on blur', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InlineRenameHeading value="Original" onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Updated');
    input.blur();
    expect(onChange).toHaveBeenCalledWith('Updated');
  });

  it('discards on Escape without calling onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InlineRenameHeading value="Keep" onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Throwaway{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });

  it('does not commit an empty draft', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InlineRenameHeading value="Original" onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.keyboard('{Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });
});
