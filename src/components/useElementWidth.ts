import { useEffect, useRef, useState } from 'react';

/**
 * Misst die tatsächliche Breite eines Elements. Diagramme und Balken brauchen
 * echte Pixel, damit Schrift überall gleich groß bleibt und Beschriftungen nur
 * dort erscheinen, wo sie wirklich hineinpassen.
 *
 * Der Startwert ist bewusst 0: Ein von vornherein breit gezeichnetes Kind würde
 * die Mindestbreite seines Elternelements hochziehen und könnte danach nie
 * wieder schrumpfen — die Seite bliebe auf schmalen Geräten zu breit.
 * Erst messen, dann zeichnen.
 */
export function useElementWidth<T extends HTMLElement>(startwert = 0) {
  const ref = useRef<T | null>(null);
  const [breite, setzeBreite] = useState(startwert);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const messen = () => setzeBreite(element.getBoundingClientRect().width);
    messen();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', messen);
      return () => window.removeEventListener('resize', messen);
    }
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(element);
    return () => beobachter.disconnect();
  }, [startwert]);

  return [ref, breite] as const;
}
