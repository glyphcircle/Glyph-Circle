import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import './App.css';
import { PaymentProvider } from './context/PaymentContext';
import { LanguageProvider } from './context/LanguageContext';
import { DbProvider } from './context/DbContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);

// ✅ Get Google Client ID from environment variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

if (!GOOGLE_CLIENT_ID) {
  console.error('❌ VITE_GOOGLE_CLIENT_ID not found in .env file');
}

root.render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <HashRouter>
      <LanguageProvider>
        <AuthProvider>
          <DbProvider>
            <ThemeProvider>
              <PaymentProvider>
                <App />
              </PaymentProvider>
            </ThemeProvider>
          </DbProvider>
        </AuthProvider>
      </LanguageProvider>
    </HashRouter>
  </GoogleOAuthProvider>
);
