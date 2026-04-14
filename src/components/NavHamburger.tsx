import { Menu } from 'lucide-react';
import { useAppStore } from '@/store';
import { Button } from './ui/button';

export function NavHamburger() {
  const setOpen = useAppStore((s) => s.setNavDrawerOpen);
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label="Open navigation"
      onClick={() => setOpen(true)}
    >
      <Menu className="h-5 w-5" aria-hidden />
    </Button>
  );
}
