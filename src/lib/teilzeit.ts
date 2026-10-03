/**
 * Teilzeit-Rechner: Was macht eine Stundenreduktion mit dem Netto?
 *
 * Das Brutto sinkt proportional zu den Stunden. Das Netto nicht: weil Steuer-
 * und Beitragslast progressiv wirken, fällt der Netto-Verlust kleiner aus als
 * der Brutto-Verlust. Dieses Modul macht genau diesen Unterschied sichtbar —
 * samt der Kehrseite, dem Verlust an Rentenanwartschaft.
 */

import { RENTE, SV, WOCHEN_PRO_MONAT } from './constants';
import { berechneGehalt, type PayrollInput, type PayrollResult } from './payroll';
import { cent } from './sozialversicherung';

export interface TeilzeitEingabe {
  /** Ausgangslage; `bruttoMonat` gehört zu `stundenIst`. */
  basis: PayrollInput;
  /** Aktuelle Wochenstunden. */
  stundenIst: number;
  /** Geplante Wochenstunden. */
  stundenZiel: number;
}

export interface TeilzeitPunkt {
  stunden: number;
  bruttoMonat: number;
  nettoMonat: number;
  /** Differenz zur Ausgangslage (negativ bei Reduktion). */
  bruttoDiff: number;
  nettoDiff: number;
  /** Netto als Anteil des Ausgangs-Nettos. */
  nettoAnteil: number;
  /** Stunden als Anteil der Ausgangsstunden (= Brutto-Anteil). */
  stundenAnteil: number;
  /** Netto je Wochenstunde und Monat — misst, wie „effizient“ die Stunden sind. */
  nettoProWochenstunde: number;
  abrechnung: PayrollResult;
}

export interface TeilzeitErgebnis {
  ist: PayrollResult;
  ziel: PayrollResult;
  stundenIst: number;
  stundenZiel: number;
  /** Weggefallene Wochenstunden (positiv bei Reduktion). */
  stundenDifferenz: number;
  bruttoVerlustMonat: number;
  nettoVerlustMonat: number;
  bruttoVerlustJahr: number;
  nettoVerlustJahr: number;
  /**
   * Anteil des wegfallenden Bruttos, der tatsächlich im Netto ankommt.
   * 0,62 heißt: von 100 € weniger Brutto fehlen nur 62 € im Geldbeutel.
   */
  grenzbelastung: number;
  /** Netto-Kosten je aufgegebener Wochenstunde, Euro pro Monat. */
  kostenProWochenstundeMonat: number;
  /** Stundenlohn brutto, unverändert zwischen Ist und Ziel. */
  stundenlohnBrutto: number;
  /** Netto je Wochenstunde: vorher und nachher. */
  nettoProWochenstundeIst: number;
  nettoProWochenstundeZiel: number;
  /** Veränderung der Entgeltpunkte pro Jahr. */
  entgeltpunkteIst: number;
  entgeltpunkteZiel: number;
  /** Monatliche Bruttorente, die ein Jahr Teilzeit gegenüber Vollzeit kostet. */
  rentenverlustProJahrTeilzeit: number;
  /** Verlauf über die Stundenspanne — Datengrundlage des Diagramms. */
  verlauf: TeilzeitPunkt[];
  hinweise: string[];
}

export interface EntgeltpunktLage {
  /** Pflichtversichert in der gesetzlichen Rentenversicherung. */
  rvPflicht: boolean;
  /** Das Entgelt liegt in der Minijob-Zone. */
  minijob: boolean;
  /** Im Minijob: Befreiung von der Rentenversicherungspflicht beantragt. */
  minijobRvBefreiung: boolean;
}

/**
 * Entgeltpunkte der gesetzlichen Rentenversicherung für ein Jahresbrutto.
 *
 * Im Übergangsbereich zählt seit 2023 das volle Arbeitsentgelt. Im Minijob mit
 * Befreiung von der Versicherungspflicht erwirbt man nur noch anteilig Punkte:
 * Der Arbeitgeber zahlt pauschal 15 % statt der vollen 18,6 %.
 */
export function entgeltpunkte(bruttoJahr: number, lage?: EntgeltpunktLage): number {
  if (lage && !lage.rvPflicht) return 0;
  const beitragspflichtig = Math.min(bruttoJahr, SV.bbgRvAvJahr);
  const voll = beitragspflichtig / RENTE.durchschnittsentgelt;
  if (lage?.minijob && lage.minijobRvBefreiung) {
    return voll * (SV.minijobPauschaleRv / SV.rvGesamt);
  }
  return voll;
}

/** Leitet die für die Rentenanwartschaft maßgebliche Lage aus einer Abrechnung ab. */
function lageAus(abrechnung: PayrollResult): EntgeltpunktLage {
  return {
    rvPflicht: abrechnung.eingabe.rvPflicht,
    minijob: abrechnung.sv.modus === 'minijob',
    minijobRvBefreiung: abrechnung.eingabe.minijobRvBefreiung,
  };
}

function punkt(basis: PayrollInput, stundenIst: number, stunden: number, ist: PayrollResult): TeilzeitPunkt {
  const bruttoMonat = cent((basis.bruttoMonat / stundenIst) * stunden);
  const abrechnung = berechneGehalt({ ...basis, bruttoMonat });
  return {
    stunden,
    bruttoMonat,
    nettoMonat: abrechnung.netto.monat,
    bruttoDiff: cent(bruttoMonat - ist.brutto.monat),
    nettoDiff: cent(abrechnung.netto.monat - ist.netto.monat),
    nettoAnteil: ist.netto.monat > 0 ? abrechnung.netto.monat / ist.netto.monat : 0,
    stundenAnteil: stunden / stundenIst,
    nettoProWochenstunde: stunden > 0 ? cent(abrechnung.netto.monat / stunden) : 0,
    abrechnung,
  };
}

/**
 * Stundenraster für das Diagramm: halbe Stunden bis zur Ausgangszeit,
 * zuzüglich der Zielstundenzahl, damit der gewählte Punkt exakt getroffen wird.
 */
function stundenRaster(stundenIst: number, stundenZiel: number): number[] {
  const max = Math.max(stundenIst, stundenZiel);
  const schritt = max > 30 ? 1 : 0.5;
  const werte = new Set<number>();
  // Obergrenze gegen unsinnige Zwischenstände beim Tippen (z. B. "350" Stunden).
  const grenze = Math.min(max, 80);
  for (let s = schritt; s <= grenze + 1e-9; s += schritt) werte.add(Math.round(s * 100) / 100);
  werte.add(stundenIst);
  werte.add(stundenZiel);
  return [...werte].filter((s) => s > 0).sort((a, b) => a - b);
}

export function berechneTeilzeit(eingabe: TeilzeitEingabe): TeilzeitErgebnis {
  const { basis, stundenIst, stundenZiel } = eingabe;
  const sichereStundenIst = stundenIst > 0 ? stundenIst : 1;

  const ist = berechneGehalt(basis);
  const zielBrutto = cent((basis.bruttoMonat / sichereStundenIst) * stundenZiel);
  const ziel = berechneGehalt({ ...basis, bruttoMonat: zielBrutto });

  const stundenDifferenz = cent(sichereStundenIst - stundenZiel);
  const bruttoVerlustMonat = cent(ist.brutto.monat - ziel.brutto.monat);
  const nettoVerlustMonat = cent(ist.netto.monat - ziel.netto.monat);

  const grenzbelastung = bruttoVerlustMonat !== 0 ? nettoVerlustMonat / bruttoVerlustMonat : 0;

  const epIst = entgeltpunkte(ist.brutto.jahr, lageAus(ist));
  const epZiel = entgeltpunkte(ziel.brutto.jahr, lageAus(ziel));

  const verlauf = stundenRaster(sichereStundenIst, stundenZiel).map((s) =>
    punkt(basis, sichereStundenIst, s, ist),
  );

  return {
    ist,
    ziel,
    stundenIst: sichereStundenIst,
    stundenZiel,
    stundenDifferenz,
    bruttoVerlustMonat,
    nettoVerlustMonat,
    bruttoVerlustJahr: cent(bruttoVerlustMonat * 12),
    nettoVerlustJahr: cent(nettoVerlustMonat * 12),
    grenzbelastung,
    kostenProWochenstundeMonat:
      stundenDifferenz !== 0 ? cent(nettoVerlustMonat / stundenDifferenz) : 0,
    stundenlohnBrutto: cent(basis.bruttoMonat / (sichereStundenIst * WOCHEN_PRO_MONAT)),
    nettoProWochenstundeIst: cent(ist.netto.monat / sichereStundenIst),
    nettoProWochenstundeZiel: stundenZiel > 0 ? cent(ziel.netto.monat / stundenZiel) : 0,
    entgeltpunkteIst: epIst,
    entgeltpunkteZiel: epZiel,
    rentenverlustProJahrTeilzeit: cent((epIst - epZiel) * RENTE.rentenwert),
    verlauf,
    hinweise: teilzeitHinweise(ist, ziel, grenzbelastung),
  };
}

function teilzeitHinweise(ist: PayrollResult, ziel: PayrollResult, grenzbelastung: number): string[] {
  const hinweise: string[] = [];

  if (ziel.brutto.monat < ist.brutto.monat && grenzbelastung > 0 && grenzbelastung < 1) {
    const prozent = Math.round((1 - grenzbelastung) * 100);
    hinweise.push(
      `Von jedem Euro Brutto, auf den Sie verzichten, trägt der Staat ${prozent} % mit: Steuern und Beiträge sinken ebenfalls. Im Netto spüren Sie nur ${Math.round(grenzbelastung * 100)} % der Brutto-Einbuße.`,
    );
  }

  if (ziel.sv.modus === 'uebergangsbereich' && ist.sv.modus !== 'uebergangsbereich') {
    hinweise.push(
      `Mit dem Zielbrutto landen Sie im Übergangsbereich (${SV.minijobGrenze} – ${SV.uebergangsbereichObergrenze} €). Dort sind die Sozialabgaben deutlich reduziert — das Netto fällt also weniger stark, als die Stunden sinken.`,
    );
  }

  if (ziel.sv.modus === 'minijob' && ist.sv.modus !== 'minijob') {
    hinweise.push(
      `Das Zielbrutto liegt in der Minijob-Zone (bis ${SV.minijobGrenze} €). Beachten Sie: Damit entfällt in der Regel der eigene Schutz in der Kranken-, Pflege- und Arbeitslosenversicherung.`,
    );
  }

  if (ist.sv.bbgErreicht.rvAv && !ziel.sv.bbgErreicht.rvAv) {
    hinweise.push(
      'Bisher liegt Ihr Brutto über der Beitragsbemessungsgrenze der Rentenversicherung, künftig darunter. Die Reduktion schlägt deshalb stärker auf die Rentenanwartschaft durch als auf das Netto.',
    );
  }

  if (ziel.brutto.monat > ist.brutto.monat) {
    hinweise.push(
      'Sie haben mehr Stunden als bisher gewählt — die Werte zeigen entsprechend eine Aufstockung statt einer Reduktion.',
    );
  }

  return hinweise;
}
