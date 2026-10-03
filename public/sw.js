/**
 * Service Worker für den Offline-Betrieb.
 *
 * Er speichert ausschließlich die Dateien dieser Anwendung im Browser-Cache.
 * Es werden keine Daten erhoben und nichts an irgendeinen Server gesendet;
 * Anfragen an fremde Hosts werden gar nicht angefasst.
 *
 * Die beiden folgenden Zeilen werden beim Build durch die tatsächlichen
 * Dateinamen und eine Build-Kennung ersetzt (siehe vite.config.ts).
 */
const CACHE = 'finpal-dev'; /* BUILD:CACHE */
const PRECACHE = ['./']; /* BUILD:PRECACHE */

self.addEventListener('install', (ereignis) => {
  // Beim Installieren die gesamte Anwendung ablegen, damit schon der zweite
  // Aufruf — und jeder Aufruf ohne Netz — sofort funktioniert.
  ereignis.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => { /* Einzelne fehlende Datei darf die Installation nicht stoppen. */ })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ereignis) => {
  ereignis.waitUntil(
    caches.keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== 'GET') return;

  const url = new URL(anfrage.url);
  // Nur eigene Dateien — niemals fremde Hosts.
  if (url.origin !== self.location.origin) return;

  ereignis.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // ignoreVary ist hier nötig: Manche Server senden „Vary: Origin“, und
    // Modul-Skripte schicken einen Origin-Header mit, den die beim Installieren
    // abgelegten Anfragen nicht hatten. Die Dateien sind statisch und vom
    // Origin-Header unabhängig, deshalb ist das unbedenklich.
    const treffer = await cache.match(anfrage, { ignoreSearch: true, ignoreVary: true });
    if (treffer) return treffer;
    try {
      const antwort = await fetch(anfrage);
      if (antwort.ok && antwort.type === 'basic') cache.put(anfrage, antwort.clone());
      return antwort;
    } catch (fehler) {
      // Seitenaufrufe ohne Netz bekommen die zwischengespeicherte Startseite.
      if (anfrage.mode === 'navigate') {
        const start = await cache.match('./') || await cache.match('./index.html');
        if (start) return start;
      }
      throw fehler;
    }
  })());
});
