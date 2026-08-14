import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/** Catches runtime render errors so the app is not blanked out. */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-5"
        >
          <p className="text-sm font-medium text-destructive">Что-то пошло не так</p>
          <p className="mt-1 text-sm text-muted-foreground">{this.state.error.message}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => this.setState({ error: null })}
          >
            Повторить
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
