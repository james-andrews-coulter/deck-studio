import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupNameInput } from '@/components/GroupNameInput';

describe('GroupNameInput', () => {
  it('disables the confirm button when the trimmed name is empty', () => {
    render(<GroupNameInput onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: /create group/i })).toBeDisabled();
  });

  it('calls onConfirm with the trimmed name on button click', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<GroupNameInput onConfirm={onConfirm} onCancel={() => {}} />);
    await user.type(screen.getByRole('textbox'), '   Warm-ups   ');
    await user.click(screen.getByRole('button', { name: /create group/i }));
    expect(onConfirm).toHaveBeenCalledWith('Warm-ups');
  });

  it('commits on Enter', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<GroupNameInput onConfirm={onConfirm} onCancel={() => {}} />);
    await user.type(screen.getByRole('textbox'), 'Starters{Enter}');
    expect(onConfirm).toHaveBeenCalledWith('Starters');
  });

  it('calls onCancel on Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<GroupNameInput onConfirm={() => {}} onCancel={onCancel} />);
    await user.type(screen.getByRole('textbox'), 'foo{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Cancel button click', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<GroupNameInput onConfirm={() => {}} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('respects defaultValue', () => {
    render(
      <GroupNameInput defaultValue="Starters" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(screen.getByRole('textbox')).toHaveValue('Starters');
  });
});
