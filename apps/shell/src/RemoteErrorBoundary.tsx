import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  remote: string;
  fallback?: ReactNode;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Isolates a federated remote so a load or render failure degrades that one
 * surface instead of taking down the shell. Use one boundary per `<RemoteX />`
 * mount in the routing tree.
 */
export class RemoteErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[mfe] remote "${this.props.remote}" failed:`, error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            role="alert"
            style={{
              padding: "1rem",
              border: "1px solid #f5c2c7",
              background: "#f8d7da",
              color: "#842029",
              borderRadius: 4,
            }}
          >
            <strong>{this.props.remote}</strong> is temporarily unavailable.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
