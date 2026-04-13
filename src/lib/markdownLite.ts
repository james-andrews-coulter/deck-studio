import React from 'react';

// Note: we never manually HTML-escape text. React escapes string children
// by default when rendering, which is what keeps this XSS-safe.

type Inline = { type: 'text' | 'strong' | 'em'; text: string };

function tokenizeInline(raw: string): Inline[] {
  const tokens: Inline[] = [];
  let i = 0;
  while (i < raw.length) {
    if (raw.startsWith('**', i)) {
      const end = raw.indexOf('**', i + 2);
      if (end !== -1) {
        tokens.push({ type: 'strong', text: raw.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (raw[i] === '*') {
      const end = raw.indexOf('*', i + 1);
      if (end !== -1 && end > i + 1) {
        tokens.push({ type: 'em', text: raw.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    let j = i + 1;
    while (j < raw.length && raw[j] !== '*') j++;
    tokens.push({ type: 'text', text: raw.slice(i, j) });
    i = j;
  }
  return tokens;
}

function renderInline(raw: string, keyPrefix: string): React.ReactNode[] {
  const tokens = tokenizeInline(raw);
  const out: React.ReactNode[] = [];
  tokens.forEach((t, i) => {
    const key = `${keyPrefix}-${i}`;
    if (t.type === 'strong') {
      out.push(React.createElement('strong', { key }, t.text));
    } else if (t.type === 'em') {
      out.push(React.createElement('em', { key }, t.text));
    } else {
      out.push(React.createElement(React.Fragment, { key }, t.text));
    }
  });
  return out;
}

function renderParagraph(lines: string[], keyPrefix: string): React.ReactNode {
  const children: React.ReactNode[] = [];
  lines.forEach((line, idx) => {
    if (idx > 0) children.push(React.createElement('br', { key: `${keyPrefix}-br-${idx}` }));
    children.push(...renderInline(line, `${keyPrefix}-${idx}`));
  });
  return React.createElement('p', { key: keyPrefix }, ...children);
}

function renderList(
  tag: 'ul' | 'ol',
  items: string[],
  keyPrefix: string,
): React.ReactNode {
  const children = items.map((text, i) =>
    React.createElement(
      'li',
      { key: `${keyPrefix}-${i}` },
      ...renderInline(text, `${keyPrefix}-${i}`),
    ),
  );
  return React.createElement(tag, { key: keyPrefix }, ...children);
}

export function renderMarkdownLite(src: string): React.ReactNode {
  if (!src) return null;
  const paragraphs = src.split(/\n\s*\n/);
  const blocks: React.ReactNode[] = [];
  paragraphs.forEach((para, pIdx) => {
    const lines = para.split('\n').map((l) => l.replace(/\s+$/, ''));
    if (lines.every((l) => /^\d+\.\s+\S/.test(l))) {
      blocks.push(
        renderList(
          'ol',
          lines.map((l) => l.replace(/^\d+\.\s+/, '')),
          `p${pIdx}`,
        ),
      );
      return;
    }
    if (lines.every((l) => /^-\s+\S/.test(l))) {
      blocks.push(
        renderList(
          'ul',
          lines.map((l) => l.replace(/^-\s+/, '')),
          `p${pIdx}`,
        ),
      );
      return;
    }
    blocks.push(renderParagraph(lines, `p${pIdx}`));
  });
  return React.createElement(React.Fragment, null, ...blocks);
}
