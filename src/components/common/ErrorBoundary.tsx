import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';
import { diagnostics } from '../../utils/diagnostics';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: '',
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Structured diagnostic capture without leaking sensitive details
    diagnostics.errorBoundary('React rendering failure', error, errorInfo.componentStack || undefined);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-center items-center px-4 py-12 text-center select-none">
          <div className="max-w-md w-full bg-[#FCFBF8] border border-[#E8E0D0] p-8 sm:p-10 rounded-xs shadow-xl flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-[#171717] text-[#C8A96B] flex items-center justify-center mb-5 border border-[#C8A96B]/40 shadow-xs">
              <AlertCircle className="w-7 h-7" />
            </div>

            <span className="text-[10px] uppercase tracking-[0.3em] text-[#C8A96B] font-semibold mb-2">
              Beki's Studio
            </span>

            <h2
              className="font-serif text-2xl sm:text-3xl text-[#171717] font-normal tracking-wide mb-3"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Something Went Wrong
            </h2>

            <div className="w-12 h-px bg-[#C8A96B]/60 mb-4" />

            <p className="text-xs sm:text-sm text-[#77736B] font-light leading-relaxed mb-6">
              {this.props.fallbackMessage ||
                'An unexpected error occurred while loading this memory experience. Your photos and data remain secure.'}
            </p>

            {diagnostics.isDebug() && this.state.error && (
              <div className="w-full mb-6 p-3 bg-[#F8F6F0] border border-[#E8E0D0] text-left rounded-xs overflow-hidden">
                <p className="text-[10px] font-mono text-[#C8A96B] font-semibold mb-1">
                  Reference: {this.state.errorId}
                </p>
                <p className="text-[11px] font-mono text-[#77736B] truncate">
                  {this.state.error.name}: {this.state.error.message || 'Unknown runtime error'}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="flex-1"
              >
                Try Again
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={this.handleGoHome}
                leftIcon={<Home className="w-3.5 h-3.5" />}
                className="flex-1"
              >
                Return Home
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-[#A8A49C] mt-8 uppercase tracking-[0.25em]">
            Beki's Studio &bull; Memories, beautifully preserved
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
