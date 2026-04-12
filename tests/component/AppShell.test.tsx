import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import DecksScreen from '@/screens/DecksScreen';
import ListsScreen from '@/screens/ListsScreen';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/decks" replace />} />
          <Route path="decks" element={<DecksScreen />} />
          <Route path="lists" element={<ListsScreen />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('AppShell', () => {
  it('renders Decks and Lists tabs', () => {
    renderAt('/decks');
    expect(screen.getByRole('link', { name: /decks/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /lists/i })).toBeInTheDocument();
  });

  it('renders the Decks screen at /decks', () => {
    renderAt('/decks');
    expect(screen.getByRole('heading', { name: /^decks$/i })).toBeInTheDocument();
  });

  it('renders the Lists screen at /lists', () => {
    renderAt('/lists');
    expect(screen.getByRole('heading', { name: /lists/i })).toBeInTheDocument();
  });
});
