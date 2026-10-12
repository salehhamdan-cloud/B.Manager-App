import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import AppWrapper from './App';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { NotificationsProvider } from './contexts/NotificationsContext';
import { GoogleDriveProvider } from './contexts/GoogleDriveContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ToastProvider>
        <SettingsProvider>
          <NotificationsProvider>
            <GoogleDriveProvider>
              <AppWrapper />
            </GoogleDriveProvider>
          </NotificationsProvider>
        </SettingsProvider>
    </ToastProvider>
  </React.StrictMode>
);

// Register PWA Service Worker
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('PWA service worker registration skipped or failed:', err);
    });
  });
}
