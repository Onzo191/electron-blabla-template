import { Button } from "@chakra-ui/react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { type AppError, toAppError } from "../lib/error";
import { logger } from "../lib/logger";

type Props = {
  children: ReactNode;
  fallback?: (error: AppError, reset: () => void) => ReactNode;
};

type State = {
  error: AppError | null;
};

// React only supports catching render errors via a class component's
// getDerivedStateFromError/componentDidCatch — there is no hook equivalent —
// so this is the one sanctioned exception to the function-declaration rule.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: toAppError(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error(error.message, {
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return this.props.fallback ? (
      this.props.fallback(error, this.reset)
    ) : (
      <DefaultFallback error={error} onReset={this.reset} />
    );
  }
}

function DefaultFallback({
  error,
  onReset,
}: {
  error: AppError;
  onReset: () => void;
}): React.JSX.Element {
  return (
    <div
      role="alert"
      className="rounded-md border border-surface-200 p-4 text-sm"
    >
      <p className="mb-2 font-medium">Something went wrong.</p>
      <p className="mb-3 text-text-muted">{error.message}</p>
      <Button size="sm" onClick={onReset}>
        Try again
      </Button>
    </div>
  );
}
