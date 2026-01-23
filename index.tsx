
import React from 'react';
import ReactDOM from 'react-dom/client';
// @ts-ignore
import { HashRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import './App.css';
import { PaymentProvider } from './context/PaymentContext';
import { LanguageProvider } from './context/LanguageContext';
import { DbProvider } from './context/DbContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

/**
 * 🛡️ GLOBAL CRASH PROTECTOR V13
 * Specifically optimized for GitHub Pages + Supabase Hash Redirects.
 */
(function setupSecurityShield() {
  const forbiddenPatterns = [
    'Location.assign', 
    'script denied', 
    'NS_ERROR_DOM_BAD_URI', 
    'not allowed by',
    'security'
  ];

  const isForbidden = (msg: any): boolean => {
    const message = (msg && typeof msg === 'string') ? msg : String(msg || '');
    if (!message || message === 'undefined') return false;
    
    // ALLOW patterns related to auth confirmation and session tokens
    const isAuthRelated = 
        message.includes('access_token') || 
        message.includes('type=signup') || 
        message.includes('refresh_token') ||
        message.includes('error_description') ||
        message.includes('otp_expired');

    if (isAuthRelated) return false;

    return forbiddenPatterns.some(pattern => message.toLowerCase().includes(pattern.toLowerCase()));
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message || String(event.reason || '');
    if (isForbidden(reason)) {
      event.preventDefault();
      event.stopPropagation();
      console.warn("🛡️ Blocked Security Exception:", reason);
    }
  });

  window.addEventListener('error', (event) => {
    if (isForbidden(event.message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

// Use HashRouter for GitHub Pages compatibility
const isRestrictedEnv = 
    window.location.protocol === 'blob:' || 
    window.location.origin === 'null' ||
    window.location.hostname.includes('usercontent.goog');

const Router = isRestrictedEnv ? MemoryRouter : HashRouter;

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Router>
      <LanguageProvider>
        <DbProvider>
          <ThemeProvider>
            <AuthProvider>
              <PaymentProvider>
                <App />
              </PaymentProvider>
            </AuthProvider>
          </ThemeProvider>
        </DbProvider>
      </LanguageProvider>
    </Router>
  </React.StrictMode>
);
