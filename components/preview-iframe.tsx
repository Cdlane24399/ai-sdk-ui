"use client";

import { useMemo, useRef, useEffect, useState } from "react";

interface PreviewIframeProps {
  code: string;
  className?: string;
}

export function PreviewIframe({ code, className = "" }: PreviewIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const htmlContent = useMemo(() => {
    // Transform code to remove export statements and capture the App component
    // Replace "export default function App" with "function App"
    // Replace "export default App" with nothing (just use the function defined above)
    let transformedCode = code
      .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
      .replace(/export\s+default\s+(\w+)\s*;?/g, '')
      .replace(/export\s+function\s+(\w+)/g, 'function $1')
      .replace(/export\s+const\s+(\w+)/g, 'const $1')
      .replace(/import\s+.*?from\s+['"].*?['"];?/g, '// import removed');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script>
    window.tailwind = {
      config: {
        theme: {
          extend: {
            colors: {
              copper: '#c9956c',
              'copper-muted': 'rgba(201, 149, 108, 0.15)',
            }
          }
        }
      }
    };
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      background: white;
    }
    #root {
      min-height: 100vh;
    }
    .error-container {
      padding: 20px;
      background: #fef2f2;
      color: #dc2626;
      border-radius: 8px;
      font-family: monospace;
      font-size: 13px;
      white-space: pre-wrap;
      margin: 20px;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useRef, useMemo, useCallback } = React;

    try {
      ${transformedCode}

      const rootElement = document.getElementById('root');
      const root = ReactDOM.createRoot(rootElement);

      if (typeof App !== 'undefined') {
        root.render(<App />);
      } else {
        root.render(
          <div className="error-container">
            Error: No App component found. Make sure your code defines an App function.
          </div>
        );
      }

      window.parent.postMessage({ type: 'preview-loaded' }, '*');
    } catch (error) {
      const rootElement = document.getElementById('root');
      const root = ReactDOM.createRoot(rootElement);
      root.render(
        <div className="error-container">
          {'Error: ' + error.message}
        </div>
      );
      window.parent.postMessage({ type: 'preview-error', message: error.message }, '*');
    }
  </script>
</body>
</html>
    `.trim();
  }, [code]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "preview-loaded") {
        setIsLoading(false);
        setError(null);
      } else if (event.data?.type === "preview-error") {
        setIsLoading(false);
        setError(event.data.message);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Reset loading state when code changes
  useEffect(() => {
    setIsLoading(true);
  }, [code]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
          <div className="flex items-center gap-2 text-slate-500">
            <div className="size-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            <span className="text-sm">Loading preview...</span>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        className="w-full h-full border-0 bg-white"
        title="Component Preview"
        sandbox="allow-scripts"
        onLoad={() => {
          // Fallback if postMessage doesn't fire
          setTimeout(() => setIsLoading(false), 1000);
        }}
      />
    </div>
  );
}
