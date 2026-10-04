/**
 * Haushaltsmodell für das Geldfluss-Diagramm.
 *
 * Einnahmen fließen in einen gemeinsamen Topf, von dem die Ausgaben abgehen.
 * Ausgaben dürfen Unterposten haben; dann ergibt sich ihr Betrag aus deren
 * Summe. Was übrig bleibt, ist der Überschuss — reicht das Geld nicht, wird
 * die Lücke als Fehlbetrag ausgewiesen.
 */

import { neueId } from './id';
import { cent } from './sozialversicherung';

export interface Unterposten {
  id: string;
  name: string;
  betrag: number;
}

export interface Ausgabe {
  id: string;
  name: string;
  /** Nur maßgeblich, solange keine Unterposten vorhanden sind. */
  betrag: number;
  unterposten: Unterposten[];
}

export interface Einnahme {
  id: string;
  name: string;
  betrag: number;
}

export interface Budget {
  einnahmen: Einnahme[];
  ausgaben: Ausgabe[];
}

export interface BudgetSummen {
  einnahmen: number;
  ausgaben: number;
  /** Einnahmen minus Ausgaben — negativ bedeutet Fehlbetrag. */
  saldo: number;
  /** Anteil des Überschusses an den Einnahmen; 0, wenn nichts übrig bleibt. */
  sparquote: number;
  /** Größter Ausgabenposten, für die Einordnung in der Oberfläche. */
  groessterPosten: { name: string; betrag: number; anteil: number } | null;
}

export { neueId };

/** Betrag einer Ausgabe: Summe der Unterposten, sonst der eigene Wert. */
export function ausgabeBetrag(ausgabe: Ausgabe): number {
  if (ausgabe.unterposten.length === 0) return Math.max(0, ausgabe.betrag);
  return cent(ausgabe.unterposten.reduce((summe, u) => summe + Math.max(0, u.betrag), 0));
}

export function budgetSummen(budget: Budget): BudgetSummen {
  const einnahmen = cent(budget.einnahmen.reduce((s, e) => s + Math.max(0, e.betrag), 0));
  const posten = budget.ausgaben.map((a) => ({ name: a.name, betrag: ausgabeBetrag(a) }));
  const ausgaben = cent(posten.reduce((s, p) => s + p.betrag, 0));
  const saldo = cent(einnahmen - ausgaben);

  const groesster = posten.reduce<{ name: string; betrag: number } | null>(
    (beste, p) => (p.betrag > 0 && (!beste || p.betrag > beste.betrag) ? p : beste),
    null,
  );

  return {
    einnahmen,
    ausgaben,
    saldo,
    sparquote: einnahmen > 0 && saldo > 0 ? saldo / einnahmen : 0,
    groessterPosten: groesster && einnahmen > 0
      ? { ...groesster, anteil: groesster.betrag / einnahmen }
      : null,
  };
}

/** Ein realistisches Beispiel, damit der Rechner nicht leer startet. */
export function beispielBudget(): Budget {
  return {
    einnahmen: [
      { id: 'e-lohn', name: 'Gehalt (netto)', betrag: 2605.5 },
      { id: 'e-neben', name: 'Nebentätigkeit', betrag: 320 },
    ],
    ausgaben: [
      {
        id: 'a-wohnen', name: 'Wohnen', betrag: 0,
        unterposten: [
          { id: 'u-miete', name: 'Miete', betrag: 980 },
          { id: 'u-neben', name: 'Nebenkosten', betrag: 180 },
          { id: 'u-strom', name: 'Strom', betrag: 65 },
        ],
      },
      {
        id: 'a-leben', name: 'Lebenshaltung', betrag: 0,
        unterposten: [
          { id: 'u-lebensmittel', name: 'Lebensmittel', betrag: 420 },
          { id: 'u-drogerie', name: 'Drogerie', betrag: 60 },
        ],
      },
      {
        id: 'a-mobil', name: 'Mobilität', betrag: 0,
        unterposten: [
          { id: 'u-ticket', name: 'Deutschlandticket', betrag: 58 },
          { id: 'u-rad', name: 'Fahrrad', betrag: 25 },
        ],
      },
      { id: 'a-vers', name: 'Versicherungen', betrag: 145, unterposten: [] },
      {
        id: 'a-frei', name: 'Freizeit', betrag: 0,
        unterposten: [
          { id: 'u-abos', name: 'Abonnements', betrag: 35 },
          { id: 'u-ausgehen', name: 'Ausgehen', betrag: 140 },
          { id: 'u-urlaub', name: 'Urlaubsrücklage', betrag: 150 },
        ],
      },
    ],
  };
}

/** Leeres Budget zum Selbstbefüllen. */
export function leeresBudget(): Budget {
  return {
    einnahmen: [{ id: neueId('e'), name: 'Gehalt (netto)', betrag: 0 }],
    ausgaben: [{ id: neueId('a'), name: 'Wohnen', betrag: 0, unterposten: [] }],
  };
}
