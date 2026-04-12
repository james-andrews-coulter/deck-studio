import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/AppShell';
import DecksScreen from '@/screens/DecksScreen';
import ListsScreen from '@/screens/ListsScreen';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/decks" replace /> },
      { path: 'decks', element: <DecksScreen /> },
      { path: 'lists', element: <ListsScreen /> },
    ],
  },
]);
