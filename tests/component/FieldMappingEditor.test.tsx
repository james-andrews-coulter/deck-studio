import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldMappingEditor } from '@/components/FieldMappingEditor';

const cards = [{ id: 'c1', fields: { prompt: 'Hello', category: 'Warmup' } }];

describe('FieldMappingEditor', () => {
  it('disables save when no title is chosen', () => {
    render(
      <FieldMappingEditor
        cards={cards}
        detectedKeys={['prompt', 'category']}
        initial={{ title: '' }}
        onSave={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('enables save and calls onSave with chosen mapping', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <FieldMappingEditor
        cards={cards}
        detectedKeys={['prompt', 'category']}
        initial={{ title: 'prompt' }}
        onSave={onSave}
      />
    );
    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ title: 'prompt' }));
  });

  it('renders a preview using the current mapping', () => {
    render(
      <FieldMappingEditor
        cards={cards}
        detectedKeys={['prompt', 'category']}
        initial={{ title: 'prompt' }}
        onSave={() => {}}
      />
    );
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
