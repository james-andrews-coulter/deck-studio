import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders the title as a heading', () => {
    render(<EmptyState title="No decks yet" />);
    expect(screen.getByRole('heading', { name: /no decks yet/i })).toBeInTheDocument();
  });

  it('renders a body when provided', () => {
    render(<EmptyState title="Empty" body="Import a deck to get started." />);
    expect(screen.getByText(/import a deck to get started/i)).toBeInTheDocument();
  });

  it('skips the body when omitted', () => {
    render(<EmptyState title="Empty" />);
    // Body renders via <p>, so if omitted, there is no paragraph beyond any optional action.
    expect(document.querySelectorAll('p').length).toBe(0);
  });

  it('renders an optional action node', () => {
    render(<EmptyState title="Empty" action={<a href="/x">Learn more</a>} />);
    expect(screen.getByRole('link', { name: /learn more/i })).toBeInTheDocument();
  });
});
