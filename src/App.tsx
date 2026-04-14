import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
      <Toaster
        position="bottom-center"
        offset={72}
        mobileOffset={72}
        toastOptions={{ className: 'max-w-[calc(100vw-2rem)]' }}
      />
    </>
  );
}
