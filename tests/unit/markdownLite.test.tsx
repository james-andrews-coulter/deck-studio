import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderMarkdownLite } from '@/lib/markdownLite';

function html(node: React.ReactNode): string {
  const { container } = render(<>{node}</>);
  return container.innerHTML;
}

describe('renderMarkdownLite', () => {
  it('renders a single paragraph', () => {
    const out = html(renderMarkdownLite('Hello world'));
    expect(out).toBe('<p>Hello world</p>');
  });

  it('splits paragraphs on blank lines', () => {
    const out = html(renderMarkdownLite('First.\n\nSecond.'));
    expect(out).toBe('<p>First.</p><p>Second.</p>');
  });

  it('renders single newlines as <br> within a paragraph', () => {
    const out = html(renderMarkdownLite('Line one\nLine two'));
    expect(out).toBe('<p>Line one<br>Line two</p>');
  });

  it('renders **bold** and *italic*', () => {
    const out = html(renderMarkdownLite('**strong** and *emph*'));
    expect(out).toBe('<p><strong>strong</strong> and <em>emph</em></p>');
  });

  it('renders an unordered list', () => {
    const out = html(renderMarkdownLite('- one\n- two\n- three'));
    expect(out).toBe('<ul><li>one</li><li>two</li><li>three</li></ul>');
  });

  it('renders an ordered list', () => {
    const out = html(renderMarkdownLite('1. one\n2. two\n3. three'));
    expect(out).toBe('<ol><li>one</li><li>two</li><li>three</li></ol>');
  });

  it('escapes HTML in plain text', () => {
    const out = html(renderMarkdownLite('<script>alert(1)</script>'));
    expect(out).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>');
  });

  it('escapes HTML inside inline marks', () => {
    const out = html(renderMarkdownLite('**<b>hi</b>**'));
    expect(out).toBe('<p><strong>&lt;b&gt;hi&lt;/b&gt;</strong></p>');
  });

  it('treats lines that look like headings as literal paragraphs', () => {
    const out = html(renderMarkdownLite('# Not a heading'));
    expect(out).toBe('<p># Not a heading</p>');
  });

  it('handles empty input', () => {
    const out = html(renderMarkdownLite(''));
    expect(out).toBe('');
  });

  it('handles mixed content', () => {
    const src = 'Intro paragraph.\n\n- first\n- second\n\nClosing **paragraph**.';
    const out = html(renderMarkdownLite(src));
    expect(out).toBe(
      '<p>Intro paragraph.</p><ul><li>first</li><li>second</li></ul><p>Closing <strong>paragraph</strong>.</p>'
    );
  });
});
