// index.tsx (root level - entry point)
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css'; // If you have global styles

// Detect if we're in a sandboxed iframe (AI Studio Preview)
const isSandboxed = (() => {
  try {
    window.history.state;
    return false;
  } catch {
    return true;
  }
})();

const Router = isSandboxed ? MemoryRouter : BrowserRouter;

const container = document.getElementById('root');
if (!container) throw new Error('Root element not found');

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <Router initialEntries={['/login']}>
          <App />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
