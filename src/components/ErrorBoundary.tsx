import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(err: Error) {
    console.error('[deck-studio]', err);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <h2 className="text-lg font-semibold">Something went wrong.</h2>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {this.state.error.message}
          </pre>
          <button className="mt-4 underline" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
