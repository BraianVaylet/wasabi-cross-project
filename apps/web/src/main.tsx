import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@wasabi-cross/ui/styles.css';
import { App } from './app/App.tsx';

const container = document.getElementById('root');

if (!container) {
  throw new Error('No existe #root en index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
