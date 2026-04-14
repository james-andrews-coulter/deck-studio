import { NavLink } from 'react-router-dom';
import { Layers, ListChecks } from 'lucide-react';
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">Deck Studio</SheetTitle>
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
