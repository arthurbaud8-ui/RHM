import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erreur capturée par ErrorBoundary:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-bg p-4">
          <div className="max-w-md space-y-4 rounded-lg border border-border bg-bg-elevated p-6">
            <h1 className="text-lg font-semibold text-text">
              Une erreur s'est produite
            </h1>
            <p className="text-sm text-text-muted">
              {this.state.error?.message || 'Erreur inconnue'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-linkedin px-4 py-2 text-sm font-semibold text-white"
            >
              Recharger la page
            </button>
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-text-muted">
                Détails techniques
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-slate-100 p-2 text-xs">
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
