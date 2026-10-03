import { useState } from 'react';
import { numFest, numFlex, parseDezimal, zumBearbeiten } from '../lib/format';

export interface ZahlEntwurfOptionen {
  min?: number;
  max?: number;
  /** Tausenderpunkte in der Ruhedarstellung — bei Jahreszahlen abschalten. */
  gruppiert?: boolean;
  /** Feste Nachkommastellen in der Ruhedarstellung — für Geldbeträge 2. */
  dezimalstellen?: number;
}

/**
 * Hält den Rohtext eines Zahlenfeldes, solange getippt wird.
 *
 * Ohne das würde jeder Tastendruck sofort in eine Zahl umgewandelt und zurück
 * dargestellt — ein eingegebenes Komma („980,“) verschwände dabei wieder, und
 * ein geleertes Feld kippte auf null. Begrenzt wird deshalb erst beim
 * Verlassen des Feldes.
 */
export function useZahlEntwurf(
  wert: number,
  aendern: (neu: number) => void,
  { min, max, gruppiert = true, dezimalstellen }: ZahlEntwurfOptionen = {},
) {
  const [entwurf, setzeEntwurf] = useState<string | null>(null);

  const ruhe = () => {
    if (!gruppiert) return zumBearbeiten(wert);
    return dezimalstellen === undefined ? numFlex(wert) : numFest(wert, dezimalstellen);
  };

  return {
    value: entwurf ?? ruhe(),
    // Beim Fokussieren bewusst denselben Text übernehmen, der schon dasteht.
    // Würde hier umformatiert, änderte sich der Feldinhalt genau in dem Moment,
    // in dem der Browser Cursor und Auswahl setzt — der Cursor spränge ans Ende
    // und neu Getipptes würde angehängt statt zu ersetzen.
    onFocus: () => setzeEntwurf(ruhe()),
    onChange: (e: { target: { value: string } }) => {
      setzeEntwurf(e.target.value);
      const geparst = parseDezimal(e.target.value);
      // Unfertige Eingaben lassen den bisherigen Wert einfach stehen.
      if (geparst !== null && geparst !== wert) aendern(geparst);
    },
    onBlur: () => {
      const geparst = entwurf === null ? wert : parseDezimal(entwurf);
      setzeEntwurf(null);
      const endgueltig = Math.min(
        max ?? Number.POSITIVE_INFINITY,
        Math.max(min ?? Number.NEGATIVE_INFINITY, geparst ?? wert),
      );
      if (endgueltig !== wert) aendern(endgueltig);
    },
    onKeyDown: (e: { key: string; currentTarget: HTMLInputElement }) => {
      if (e.key === 'Enter') e.currentTarget.blur();
    },
  };
}
