/** Gemeinsame Hilfsfunktionen für Diagrammachsen. */

/** Runde, gut lesbare Achsenschritte für einen Wertebereich ab null. */
export function achsenSchritte(max: number, anzahl = 5): number[] {
  if (max <= 0) return [0];
  const rohSchritt = max / anzahl;
  const groessenordnung = 10 ** Math.floor(Math.log10(rohSchritt));
  const kandidaten = [1, 2, 2.5, 5, 10].map((f) => f * groessenordnung);
  const schritt = kandidaten.find((k) => k >= rohSchritt) ?? kandidaten[kandidaten.length - 1]!;
  const werte: number[] = [];
  for (let w = 0; w <= max + schritt * 0.001; w += schritt) werte.push(Math.round(w * 100) / 100);
  return werte;
}

/** Ganzzahlige Schritte für eine Achse, die vertraute Zahlen zeigen soll. */
export function ganzeSchritte(min: number, max: number, zielAnzahl = 8): number[] {
  const spanne = Math.max(1, max - min);
  const roh = spanne / zielAnzahl;
  const schritt = [1, 2, 5, 10, 20, 25, 50, 100].find((k) => k >= roh) ?? 100;
  const werte: number[] = [];
  const start = Math.ceil(min / schritt) * schritt;
  for (let w = start; w <= max + 0.001; w += schritt) werte.push(w);
  if (werte.length === 0 || werte[werte.length - 1] !== max) werte.push(max);
  return werte;
}
