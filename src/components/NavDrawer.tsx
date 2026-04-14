import { NavLink, useMatch } from 'react-router-dom';
import { BookOpen, Layers, ListChecks } from 'lucide-react';
import { useAppStore } from '@/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';
import { cn } from '@/lib/utils';

const items = [
  { to: '/decks', label: 'Decks', icon: Layers },
  { to: '/lists', label: 'Lists', icon: ListChecks },
];

export function NavDrawer() {
  const open = useAppStore((s) => s.ui.navDrawerOpen);
  const setOpen = useAppStore((s) => s.setNavDrawerOpen);
  const setExerciseSheetOpen = useAppStore((s) => s.setExerciseSheetOpen);
  const match = useMatch('/lists/:listId');
  const listId = match?.params.listId;
  const list = useAppStore((s) => (listId ? s.lists[listId] : undefined));
  const deck = useAppStore((s) => (list ? s.decks[list.deckId] : undefined));
  const exercise = list?.exerciseId
    ? deck?.exercises?.find((e) => e.id === list.exerciseId)
    : undefined;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">Deck Studio</SheetTitle>
          {exercise && (
            <button
              type="button"
              onClick={() => {
                if (listId) setExerciseSheetOpen(listId, true);
                setOpen(false);
              }}
              className="flex items-center gap-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{exercise.name} — view guide →</span>
            </button>
          )}
        </SheetHeader>
        <nav aria-label="Primary" className="flex flex-col p-2">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm',
                  isActive
                    ? 'bg-muted font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
