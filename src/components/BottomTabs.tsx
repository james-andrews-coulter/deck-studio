import { NavLink } from 'react-router-dom';
import { Layers, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/decks', label: 'Decks', icon: Layers },
  { to: '/lists', label: 'Lists', icon: ListChecks },
];

export function BottomTabs() {
  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-10 grid grid-cols-2 border-t bg-background md:static md:grid-cols-[auto_auto] md:justify-start md:gap-2 md:border-t-0 md:border-b md:px-4 md:py-2"
    >
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'relative flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium md:flex-row md:px-3 md:py-1 md:text-sm',
              isActive
                ? 'text-foreground font-semibold after:absolute after:inset-x-6 after:bottom-0 after:h-0.5 after:rounded-full after:bg-foreground md:after:inset-x-0 md:after:top-full md:after:mt-1'
                : 'text-muted-foreground'
            )
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
