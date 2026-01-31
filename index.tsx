import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

// ✅ Prevent double initialization
if (document.getElementById('root')?.hasAttribute('data-initialized')) {
  console.warn('React root already initialized, skipping...');
} else {
  // ✅ BULLETPROOF AI Studio detection
  const isAIStudio = 
    window.location.hostname.includes('.scf.usercontent.goog') || 
    window.location.hostname.includes('aistudio.google.com') ||
    window.location.hostname.includes('ai.studio') ||
    window.location.href.includes('.scf.usercontent.goog') ||
    window !== window.top; // Detects iframe

  console.log('🔍 Environment check:', {
    hostname: window.location.hostname,
    href: window.location.href,
    isIframe: window !== window.top,
    isAIStudio
  });

  // ✅ Use HashRouter in AI Studio, BrowserRouter in production
  const Router = isAIStudio ? HashRouter : BrowserRouter;

  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root element not found');
  }

  // Mark as initialized
  container.setAttribute('data-initialized', 'true');

  const root = createRoot(container);

  root.render(
    <React.StrictMode>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <App />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </React.StrictMode>
  );

  console.log(`✅ React app rendered with ${isAIStudio ? 'HASH' : 'BROWSER'} router`);
}