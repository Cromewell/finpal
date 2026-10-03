/**
 * Freiwilliges Speichern der Eingaben — ausschließlich im localStorage des
 * Browsers. Standardmäßig aus; die Daten verlassen das Gerät nie.
 */

const SCHLUESSEL = 'finpal:eingaben:v1';
const EINWILLIGUNG = 'finpal:speichern:v1';
const THEMA = 'finpal:thema:v1';

function sicher<T>(aktion: () => T, ersatz: T): T {
  try {
    return aktion();
  } catch {
    // Privates Fenster, blockierte Website-Daten, Vorschau-Kontexte.
    return ersatz;
  }
}

export function speichernErlaubt(): boolean {
  return sicher(() => localStorage.getItem(EINWILLIGUNG) === 'ja', false);
}

export function setzeSpeichernErlaubt(erlaubt: boolean): void {
  sicher(() => {
    if (erlaubt) {
      localStorage.setItem(EINWILLIGUNG, 'ja');
    } else {
      localStorage.removeItem(EINWILLIGUNG);
      localStorage.removeItem(SCHLUESSEL);
    }
  }, undefined);
}

export function ladeEingaben<T>(): Partial<T> | null {
  if (!speichernErlaubt()) return null;
  return sicher(() => {
    const roh = localStorage.getItem(SCHLUESSEL);
    return roh ? (JSON.parse(roh) as Partial<T>) : null;
  }, null);
}

export function sichereEingaben(daten: unknown): void {
  if (!speichernErlaubt()) return;
  sicher(() => localStorage.setItem(SCHLUESSEL, JSON.stringify(daten)), undefined);
}

export type Thema = 'hell' | 'dunkel' | 'system';

export function ladeThema(): Thema {
  return sicher(() => (localStorage.getItem(THEMA) as Thema | null) ?? 'system', 'system');
}

export function sichereThema(thema: Thema): void {
  sicher(() => localStorage.setItem(THEMA, thema), undefined);
}
