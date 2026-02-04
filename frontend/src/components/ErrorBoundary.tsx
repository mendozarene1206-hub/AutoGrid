/**
 * ErrorBoundary.tsx
 * 
 * React Error Boundary for graceful error handling.
 * Following Boris Cherny: "Challenge Mode" - anticipate failures.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    onReset?: () => void;
    resetKeys?: Array<string | number>;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Generic Error Boundary component.
 * 
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={<div>Something went wrong</div>}
 *   onReset={() => window.location.reload()}
 * >
 *   <TrojanUniverGrid estimationId={id} />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
    private resetTimeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
        
        this.setState({ errorInfo });
        this.props.onError?.(error, errorInfo);

        // Log to error tracking service (e.g., Sentry)
        // captureException(error, { extra: errorInfo });
    }

    componentDidUpdate(prevProps: Props): void {
        // Reset error state when resetKeys change
        if (this.state.hasError && this.props.resetKeys) {
            const hasResetKeyChanged = this.props.resetKeys.some(
                (key, index) => key !== prevProps.resetKeys?.[index]
            );

            if (hasResetKeyChanged) {
                this.handleReset();
            }
        }
    }

    componentWillUnmount(): void {
        if (this.resetTimeoutId) {
            clearTimeout(this.resetTimeoutId);
        }
    }

    handleReset = (): void => {
        this.props.onReset?.();
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleRetry = (): void => {
        // Debounce retry to prevent rapid clicking
        if (this.resetTimeoutId) {
            clearTimeout(this.resetTimeoutId);
        }

        this.resetTimeoutId = setTimeout(() => {
            this.handleReset();
        }, 300);
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div
                    style={{
                        padding: '24px',
                        border: '1px solid #ef4444',
                        borderRadius: '8px',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                    }}
                >
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>
                        ⚠️ Algo salió mal
                    </h3>
                    
                    <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>
                        Ha ocurrido un error inesperado. Por favor, intenta de nuevo.
                    </p>

                    {import.meta.env.DEV && this.state.error && (
                        <details style={{ marginBottom: '16px' }}>
                            <summary style={{ cursor: 'pointer', fontSize: '12px' }}>
                                Detalles del error (solo desarrollo)
                            </summary>
                            <pre
                                style={{
                                    marginTop: '8px',
                                    padding: '12px',
                                    background: '#fee2e2',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    overflow: 'auto',
                                    maxHeight: '200px',
                                }}
                            >
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}

                    <button
                        onClick={this.handleRetry}
                        style={{
                            padding: '8px 16px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px',
                        }}
                    >
                        🔄 Reintentar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * HOC to wrap components with ErrorBoundary.
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryProps: Omit<Props, 'children'>
): React.FC<P> {
    return function WithErrorBoundaryWrapper(props: P) {
        return (
            <ErrorBoundary {...errorBoundaryProps}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}
