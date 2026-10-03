import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const wurzel = document.getElementById('root');
if (!wurzel) throw new Error('Wurzelelement nicht gefunden');

createRoot(wurzel).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service Worker für den Offline-Betrieb. Er cacht ausschließlich die eigenen
// Dateien der Anwendung; es werden keine Daten versendet.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    // BASE_URL ist relativ ('./'), daher relativ zum Dokument auflösen.
    const basis = import.meta.env.BASE_URL;
    navigator.serviceWorker.register(`${basis}sw.js`, { scope: basis })
      .catch(() => { /* Offline-Betrieb ist eine Zugabe, kein Muss. */ });
  });
}
