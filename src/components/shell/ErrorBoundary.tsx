'use client';
/**
 * Global error boundary — keeps one broken view from taking down the shell.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[keja] view error', error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-[55vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden />
          </div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            This view hit an unexpected error. The rest of the platform is unaffected — retry,
            or reload the app if it persists.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => this.setState({ error: null })}>Try again</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload app
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
