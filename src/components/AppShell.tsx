import { Outlet } from 'react-router-dom';
import { BottomTabs } from './BottomTabs';

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col md:flex-col-reverse">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}
