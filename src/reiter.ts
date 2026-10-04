/** Die Werkzeuge der Anwendung — gemeinsam genutzt von Reiterleiste und Infotexten. */
export type Reiter =
  | 'brutto-netto' | 'teilzeit' | 'geldfluss' | 'dividenden'
  | 'kredit' | 'entnahme' | 'rente';

/**
 * Die Beschriftungen bleiben kurz: Ab sieben Werkzeugen passen ausgeschriebene
 * Namen auf keinem Bildschirm mehr in eine Zeile. Der volle Name steht im
 * Titelattribut.
 */
export const REITER: { wert: Reiter; kurz: string; titel: string }[] = [
  { wert: 'brutto-netto', kurz: 'Brutto-Netto', titel: 'Brutto-Netto-Rechner für alle Steuerklassen und Bundesländer' },
  { wert: 'teilzeit', kurz: 'Teilzeit', titel: 'Was eine geplante Stundenreduktion netto kostet' },
  { wert: 'geldfluss', kurz: 'Geldfluss', titel: 'Haushalt als Sankey-Diagramm: Einnahmen, Ausgaben, Überschuss' },
  { wert: 'dividenden', kurz: 'Dividenden', titel: 'Dividenden nach Abgeltungsteuer, auch für gemischte Depots' },
  { wert: 'kredit', kurz: 'Kredit', titel: 'Annuitätendarlehen: Tilgungsplan, Restschuld und Zinslast' },
  { wert: 'entnahme', kurz: 'Entnahme', titel: 'Entnahmeplan: Wie lange trägt das Depot?' },
  { wert: 'rente', kurz: 'Rente', titel: 'Rentenlücke: Was von der gesetzlichen Rente netto bleibt' },
];

/** Benutzt das Werkzeug den amtlichen Lohnsteuer-Rechenkern? */
export function nutztLohnsteuer(reiter: Reiter): boolean {
  return reiter === 'brutto-netto' || reiter === 'teilzeit';
}

/** Rechnet das Werkzeug mit der Abgeltungsteuer auf Kapitalerträge? */
export function nutztKapitalertragsteuer(reiter: Reiter): boolean {
  return reiter === 'dividenden' || reiter === 'entnahme';
}
