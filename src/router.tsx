import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import DecksScreen from '@/screens/DecksScreen';
import DeckConfigureScreen from '@/screens/DeckConfigureScreen';
import ListsScreen from '@/screens/ListsScreen';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/decks" replace /> },
      { path: 'decks', element: <DecksScreen /> },
      { path: 'decks/:deckId/configure', element: <DeckConfigureScreen /> },
      { path: 'lists', element: <ListsScreen /> },
    ],
  },
]);
