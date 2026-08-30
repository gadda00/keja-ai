import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** Catches render errors so a single component fault can't white-screen the SPA. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[Keja] Render error captured:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container-luxe flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-100">
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-gold-700" aria-hidden="true">
              <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h1 className="heading-display mt-6 text-3xl">Something went wrong</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
            An unexpected error occurred while rendering this page. Your data is safe —
            reloading usually resolves it. If it persists, our team would appreciate the details.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button onClick={() => window.location.reload()} className="btn-gold">Reload page</button>
            <a href={import.meta.env.BASE_URL} className="btn-outline-luxe">Back to home</a>
          </div>
          <p className="mt-6 max-w-lg truncate rounded-lg bg-cream px-3 py-2 font-mono text-[11px] text-ink-faint" role="note">
            {this.state.error.message}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
