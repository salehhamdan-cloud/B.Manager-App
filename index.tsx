import React from 'react';
import { createRoot } from 'react-dom/client';
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
