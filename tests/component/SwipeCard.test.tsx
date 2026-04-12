import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SwipeCard } from '@/components/SwipeCard';

describe('SwipeCard', () => {
  it('renders card contents', () => {
    const card = { id: 'c1', fields: { t: 'Alpha' } };
    render(<SwipeCard card={card} mapping={{ title: 't' }} onCommit={() => {}} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });
});
