import { Outlet } from 'react-router-dom';
import { BottomTabs } from './BottomTabs';

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col md:flex-col-reverse">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-1 focus:text-sm focus:shadow focus:ring-2 focus:ring-foreground"
      >
        Skip to content
      </a>
      <main id="main-content" className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}
