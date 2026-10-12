import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { diagnostics } from './utils/diagnostics';
import './index.css';

// 1. JavaScript entry-point execution has started
diagnostics.boot('Entry point started', {
  env: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
});

// Setup targeted diagnostics for uncaught global errors and unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Ignore Vite HMR WebSocket connection errors as HMR is disabled in this environment
    if (
      event.message?.includes('WebSocket closed') ||
      (typeof event.filename === 'string' && event.filename.includes('@vite/client'))
    ) {
      return;
    }
    diagnostics.captureError('Boot', `Uncaught window error: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event.reason || '');
    if (reasonStr.includes('WebSocket closed')) {
      return;
    }
    diagnostics.captureError('Boot', `Unhandled Promise Rejection: ${event.reason}`, event.reason);
  });
}

function bootstrapApplication() {
  try {
    // 2. Looking for application root
    diagnostics.boot('Looking for application root');
    const rootElement = document.getElementById('root');

    // 3. Root element validation
    if (!rootElement) {
      const errorMsg = 'Failed to locate application root element with ID "root" in DOM';
      diagnostics.captureError('Boot', errorMsg, new Error(errorMsg));
      throw new Error(`[BekiBoot] ${errorMsg}`);
    }

    // 4. Root element found and ready
    diagnostics.boot('Application root found', { tagName: rootElement.tagName });

    // 5. Creating React root
    const reactRoot = createRoot(rootElement);
    diagnostics.boot('React root created');

    // 6. Requesting initial render
    diagnostics.boot('Initial render requested');
    reactRoot.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
  } catch (error) {
    diagnostics.captureError('Boot', 'Bootstrap failed', error);
    // Display minimal graceful failure UI directly into document body if root fails entirely
    const fallbackContainer = document.getElementById('root') || document.body;
    if (fallbackContainer && !fallbackContainer.hasChildNodes()) {
      const alertBox = document.createElement('div');
      alertBox.style.cssText =
        'min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F8F6F0; font-family: serif; color: #171717; text-align: center; padding: 24px;';
      alertBox.innerHTML = `
        <div style="max-width: 420px; background: #fff; padding: 32px; border: 1px solid #E8E0D0; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
          <h2 style="font-size: 24px; margin-bottom: 12px; color: #171717;">Beki's Studio</h2>
          <p style="font-size: 14px; color: #77736B; margin-bottom: 20px;">The memory gallery could not start. Please refresh your browser or try again shortly.</p>
          <button onclick="window.location.reload()" style="background: #171717; color: #C8A96B; border: none; padding: 10px 20px; cursor: pointer; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Reload Gallery</button>
        </div>
      `;
      fallbackContainer.appendChild(alertBox);
    }
    throw error;
  }
}

bootstrapApplication();
