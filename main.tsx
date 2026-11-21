import '@vitejs/plugin-react/preamble';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { StatusBar } from '@capacitor/status-bar';

// Mode plein écran immersif : masquer immédiatement la barre d'état du système (heure, batterie, réseau)
if (typeof window !== 'undefined') {
  try {
    StatusBar.hide().catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  } catch {}
}

// Enregistrement du Service Worker pour le jeu 100% hors ligne (uniquement en production)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {},
      onOfflineReady() {
        console.log('12 PIONS : Prêt pour le mode 100% hors ligne !');
      },
    });
  } catch {}
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
