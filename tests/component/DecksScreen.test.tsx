import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DecksScreen from '@/screens/DecksScreen';
import { useAppStore } from '@/store';

const reset = () =>
  useAppStore.setState(
    (s) => ({ ...s, decks: {}, lists: {} }),
    true as unknown as false
  );

const renderScreen = () =>
  render(
    <MemoryRouter initialEntries={['/decks']}>
      <Routes>
        <Route path="/decks" element={<DecksScreen />} />
        <Route path="/decks/:id/configure" element={<div>Configure</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('DecksScreen', () => {
  beforeEach(() => {
    reset();
  });

  it('shows empty state when no decks', () => {
    renderScreen();
    expect(screen.getByText(/No decks yet/i)).toBeInTheDocument();
  });

  it('lists existing decks', () => {
    useAppStore.getState().addDeck({
      name: 'Test',
      fieldMapping: { title: 't' },
      cards: [{ id: 'c1', fields: { t: 'a' } }],
    });
    renderScreen();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
