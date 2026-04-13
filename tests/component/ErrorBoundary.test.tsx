import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function Boom({ message = 'kaboom' }: { message?: string }): never {
  throw new Error(message);
}

describe('ErrorBoundary', () => {
  // Suppress React's noisy "The above error occurred in the <Boom> component" log.
  const consoleErrorSpy = vi.spyOn(console, 'error');
  beforeEach(() => {
    consoleErrorSpy.mockImplementation(() => {});
  });
  afterEach(() => {
    consoleErrorSpy.mockReset();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('catches a thrown error and renders the fallback UI', () => {
    render(
      <ErrorBoundary>
        <Boom message="database is on fire" />
      </ErrorBoundary>
    );
    expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText('database is on fire')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('logs caught errors to the console with the [deck-studio] prefix', () => {
    render(
      <ErrorBoundary>
        <Boom message="oops" />
      </ErrorBoundary>
    );
    const loggedWithPrefix = consoleErrorSpy.mock.calls.some(
      (args) => args[0] === '[deck-studio]' && args[1] instanceof Error
    );
    expect(loggedWithPrefix).toBe(true);
  });
});
