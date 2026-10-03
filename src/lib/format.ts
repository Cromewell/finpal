/** Zahlen- und Währungsformate in deutscher Schreibweise. */

const euro2 = new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR',
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

const euro0 = new Intl.NumberFormat('de-DE', {
  style: 'currency', currency: 'EUR',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});

const zahl2 = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

const zahlFlex = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export function eur(wert: number): string {
  return euro2.format(wert);
}

export function eurRund(wert: number): string {
  return euro0.format(wert);
}

/** Vorzeichenbehaftet, für Veränderungen. */
export function eurDelta(wert: number): string {
  const vorzeichen = wert > 0 ? '+' : wert < 0 ? '−' : '';
  return `${vorzeichen}${euro2.format(Math.abs(wert))}`;
}

export function num(wert: number): string {
  return zahl2.format(wert);
}

export function numFlex(wert: number): string {
  return zahlFlex.format(wert);
}

/** Zahl mit fester Nachkommastellenzahl — für Geldbeträge in Eingabefeldern. */
export function numFest(wert: number, stellen: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: stellen, maximumFractionDigits: stellen,
  }).format(wert);
}

/** Prozentsatz aus einem Anteil, z. B. 0.0875 → „8,75 %“. */
export function prozent(anteil: number, stellen = 1): string {
  return `${new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: stellen, maximumFractionDigits: stellen,
  }).format(anteil * 100)} %`;
}

/** Stundenangabe ohne unnötige Nachkommastellen: 32 bzw. 32,5. */
export function stunden(wert: number): string {
  return zahlFlex.format(wert);
}

/**
 * Liest eine von Hand eingegebene Dezimalzahl — in deutscher wie englischer
 * Schreibweise. Gibt `null` zurück, wenn der Text (noch) keine Zahl ergibt;
 * dann bleibt der zuletzt gültige Wert stehen, statt in eine 0 zu kippen.
 *
 *   "32,5"      → 32.5
 *   "32.5"      → 32.5
 *   "1.234,50"  → 1234.5   (Punkt trennt Tausender, Komma die Dezimalen)
 *   "1,234.50"  → 1234.5
 *   ""  "-"  "," → null    (unfertige Eingabe)
 */
export function parseDezimal(roh: string): number | null {
  const text = roh.replace(/[\s '’€%]/g, '');
  if (text === '') return null;

  let normalisiert: string;
  if (text.includes(',') && text.includes('.')) {
    // Das zuletzt stehende Zeichen trennt die Dezimalstellen.
    const deutsch = text.lastIndexOf(',') > text.lastIndexOf('.');
    normalisiert = deutsch
      ? text.replace(/\./g, '').replace(',', '.')
      : text.replace(/,/g, '');
  } else {
    normalisiert = text.replace(',', '.');
  }

  if (!/^-?\d*(\.\d*)?$/.test(normalisiert)) return null;
  const wert = Number(normalisiert);
  return Number.isFinite(wert) ? wert : null;
}

/** Zahl so darstellen, wie man sie bequem weitertippt — ohne Tausenderpunkte. */
export function zumBearbeiten(wert: number): string {
  return String(wert).replace('.', ',');
}
