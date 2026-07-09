import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Point Excalidraw to local fonts directory for offline support
(window as any).EXCALIDRAW_ASSET_PATH = '/fonts/';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Failed to find the root element');
}
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
