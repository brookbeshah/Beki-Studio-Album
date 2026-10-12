/**
 * Structured diagnostics and forensics logging utility for Beki's Studio.
 * Provides safe, categorized logging with high-resolution timestamps, elapsed time,
 * error correlation, throttling to avoid flood, environment-gating, and strict privacy guards.
 */

export type DiagnosticSeverity = 'info' | 'warn' | 'error' | 'fatal';

export type DiagnosticCategory =
  | 'Boot'
  | 'App'
  | 'ErrorBoundary'
  | 'Firebase'
  | 'Network'
  | 'Media'
  | 'Auth'
  | 'Performance';

export interface DiagnosticEvent {
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  name: string;
  elapsedMs: number;
  timestamp: string;
  details?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class DiagnosticManager {
  private startTime: number = typeof performance !== 'undefined' ? performance.now() : Date.now();
  private isDetailedLoggingEnabled: boolean = false;
  private readonly isDev: boolean = import.meta.env.DEV;
  private recentLogs: Map<string, number> = new Map();
  private readonly THROTTLE_WINDOW_MS = 1000;

  constructor() {
    // Check if troubleshooting mode is enabled via localStorage or query string
    try {
      if (typeof window !== 'undefined') {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get('beki_debug') === 'true' || localStorage.getItem('beki_diagnostics_enabled') === 'true') {
          this.isDetailedLoggingEnabled = true;
        }
      }
    } catch {
      // Ignore security errors in strict iframe environments
    }
  }

  public setDetailedLogging(enabled: boolean) {
    this.isDetailedLoggingEnabled = enabled;
    try {
      if (enabled) {
        localStorage.setItem('beki_diagnostics_enabled', 'true');
      } else {
        localStorage.removeItem('beki_diagnostics_enabled');
      }
    } catch {
      // Ignore
    }
  }

  public isDebug(): boolean {
    return this.isDev || this.isDetailedLoggingEnabled;
  }

  public getElapsedMs(): number {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return Math.round((now - this.startTime) * 10) / 10;
  }

  private shouldThrottle(key: string): boolean {
    const now = Date.now();
    const last = this.recentLogs.get(key);
    if (last && now - last < this.THROTTLE_WINDOW_MS) {
      return true;
    }
    this.recentLogs.set(key, now);
    if (this.recentLogs.size > 200) {
      const oldestKey = this.recentLogs.keys().next().value;
      if (oldestKey) this.recentLogs.delete(oldestKey);
    }
    return false;
  }

  /**
   * Log startup/bootstrap events
   */
  public boot(message: string, details?: Record<string, unknown>) {
    const elapsed = this.getElapsedMs();
    console.log(`%c[BekiBoot] ${message} (+${elapsed}ms)`, 'color: #C8A96B; font-weight: bold;', details || '');
  }

  /**
   * Log application lifecycle events
   */
  public app(message: string, details?: Record<string, unknown>) {
    const elapsed = this.getElapsedMs();
    console.log(`%c[BekiApp] ${message} (+${elapsed}ms)`, 'color: #9381ff; font-weight: 500;', details || '');
  }

  /**
   * Measure and log performance metrics
   */
  public performance(name: string, durationMs: number, details?: Record<string, unknown>) {
    if (this.isDebug()) {
      const elapsed = this.getElapsedMs();
      console.log(
        `%c[BekiPerformance] ${name}: ${durationMs.toFixed(1)}ms (+${elapsed}ms)`,
        'color: #38bdf8; font-weight: 500;',
        details || ''
      );
    }
  }

  /**
   * Log React ErrorBoundary catches
   */
  public errorBoundary(message: string, error: unknown, componentStack?: string, severity: DiagnosticSeverity = 'error') {
    const elapsed = this.getElapsedMs();
    const prefix = severity === 'fatal' ? '[BekiErrorBoundary:FATAL]' : '[BekiErrorBoundary]';
    console.error(
      `%c${prefix} ${message} (+${elapsed}ms)`,
      'color: #e63946; font-weight: bold;',
      {
        severity,
        error,
        componentStack,
        route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Log Firebase or network operations
   */
  public network(message: string, details?: Record<string, unknown>) {
    if (!this.isDebug()) return;
    if (this.shouldThrottle(`net:${message}`)) return;

    const elapsed = this.getElapsedMs();
    console.log(`%c[BekiNetwork] ${message} (+${elapsed}ms)`, 'color: #06d6a0;', details || '');
  }

  /**
   * Log media loading diagnostics
   */
  public media(message: string, details?: Record<string, unknown>) {
    if (!this.isDebug()) return;
    if (this.shouldThrottle(`media:${message}`)) return;

    const elapsed = this.getElapsedMs();
    console.log(`%c[BekiMedia] ${message} (+${elapsed}ms)`, 'color: #118ab2;', details || '');
  }

  /**
   * Capture unexpected errors with safe formatting and severity
   */
  public captureError(category: DiagnosticCategory, message: string, error: unknown, severity: DiagnosticSeverity = 'error') {
    if (this.shouldThrottle(`err:${category}:${message}`)) return;

    const elapsed = this.getElapsedMs();
    const style = severity === 'fatal' 
      ? 'color: #ff0055; font-weight: 900; text-decoration: underline;' 
      : severity === 'warn' 
        ? 'color: #f59e0b; font-weight: bold;' 
        : 'color: #e63946; font-weight: bold;';

    console.error(
      `%c[Beki${category}][${severity.toUpperCase()}] Error: ${message} (+${elapsed}ms)`,
      style,
      error
    );
  }
}

export const diagnostics = new DiagnosticManager();

// Expose safe toggle to window for support/forensics
if (typeof window !== 'undefined') {
  (window as unknown as { __BEKI_DIAGNOSTICS__?: DiagnosticManager }).__BEKI_DIAGNOSTICS__ = diagnostics;
}
