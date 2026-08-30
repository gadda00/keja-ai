import './index.css';

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { AuthProvider } from '@/lib/auth';
import { TokenizeProvider } from '@/lib/tokenizeStore';

import App from './App';

// PWA: register the service worker in production (GitHub Pages)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

ReactDOM.createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <TokenizeProvider>
          <App />
        </TokenizeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
