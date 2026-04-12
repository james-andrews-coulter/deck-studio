import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardView } from '@/components/CardView';
import type { Card, FieldMapping } from '@/lib/types';

const mk = (fields: Record<string, unknown>): Card => ({ id: 'c1', fields });

describe('CardView', () => {
  it('renders title from the mapped field', () => {
    render(<CardView card={mk({ t: 'Alpha' })} mapping={{ title: 't' }} />);
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
  });

  it('renders (no title) placeholder when the title is empty', () => {
    render(<CardView card={mk({ t: '' })} mapping={{ title: 't' }} />);
    expect(screen.getByText(/\(no title\)/i)).toBeInTheDocument();
  });

  it('renders subtitle and body when mapped', () => {
    const mapping: FieldMapping = { title: 't', subtitle: 's', body: 'b' };
    render(<CardView card={mk({ t: 'Alpha', s: 'sub', b: 'body text' })} mapping={mapping} />);
    expect(screen.getByText('sub')).toBeInTheDocument();
    expect(screen.getByText('body text')).toBeInTheDocument();
  });

  it('uses title as image alt text for accessibility', () => {
    const mapping: FieldMapping = { title: 't', image: 'img' };
    render(
      <CardView
        card={mk({ t: 'Alpha', img: 'https://example.com/pic.png' })}
        mapping={mapping}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'Alpha');
    expect(img).toHaveAttribute('src', 'https://example.com/pic.png');
  });

  it('falls back to generic alt text when title is empty but an image is present', () => {
    const mapping: FieldMapping = { title: 't', image: 'img' };
    render(<CardView card={mk({ t: '', img: 'https://example.com/pic.png' })} mapping={mapping} />);
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Card image');
  });

  it('renders meta entries as key/value pairs', () => {
    const mapping: FieldMapping = { title: 't', meta: ['tags', 'difficulty'] };
    render(
      <CardView
        card={mk({ t: 'Alpha', tags: ['a', 'b'], difficulty: 3 })}
        mapping={mapping}
      />
    );
    expect(screen.getByText('tags:')).toBeInTheDocument();
    expect(screen.getByText('a, b')).toBeInTheDocument();
    expect(screen.getByText('difficulty:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('passes through className to the root article', () => {
    const { container } = render(
      <CardView card={mk({ t: 'Alpha' })} mapping={{ title: 't' }} className="custom-class" />
    );
    const article = container.querySelector('article');
    expect(article?.className).toContain('custom-class');
  });
});
