/**
 * Entnahmeplan: Wie lange trägt ein Depot eine gewünschte monatliche Entnahme?
 *
 * Der entscheidende Punkt ist die Besteuerung. Beim Verkauf von Anteilen ist
 * nicht die Entnahme steuerpflichtig, sondern allein der darin enthaltene
 * Gewinn — also der Teil, der über den Einstandswert hinausgeht. Dieser Anteil
 * ist anfangs klein und wächst mit den Jahren. Rechner, die pauschal die ganze
 * Entnahme oder gar nichts besteuern, liegen deshalb systematisch daneben.
 *
 * Besteuert wird nach denselben Regeln wie im Dividendenrechner: Teilfreistellung
 * nach § 20 InvStG, Sparer-Pauschbetrag einmal im Jahr und die Formel des
 * § 32d Abs. 1 EStG.
 */

import {
  ANLAGEART_MAP, BUNDESLAND_MAP, KAPITAL,
  type Anlageart, type BundeslandCode,
} from './constants';
import { cent } from './sozialversicherung';
import type { Veranlagung } from './dividende';
import { sparerPauschbetrag } from './dividende';

export interface EntnahmeEingabe {
  /** Heutiger Depotwert. */
  startkapital: number;
  /** Ursprünglicher Kaufpreis der Anteile — bestimmt den Gewinnanteil. */
  einstandswert: number;
  /** Gewünschte Entnahme pro Monat, nach Steuern. */
  entnahmeNettoMonat: number;
  /** Erwartete Rendite pro Jahr in Prozent. */
  rendite: number;
  /** Jährliche Steigerung der Entnahme, um die Kaufkraft zu halten. */
  inflation: number;
  anlageart: Anlageart;
  veranlagung: Veranlagung;
  /** Betrachtungszeitraum in Jahren. */
  dauerJahre: number;
}

export interface SteuerlicheLage {
  kirchensteuer: boolean;
  bundesland: BundeslandCode;
}

export interface EntnahmeJahr {
  jahr: number;
  kapitalAnfang: number;
  /** Bruttoentnahme, also inklusive der einbehaltenen Steuer. */
  entnahmeBrutto: number;
  entnahmeNetto: number;
  /** Im Jahr realisierter Gewinn vor Teilfreistellung und Pauschbetrag. */
  gewinn: number;
  steuern: number;
  wertzuwachs: number;
  kapitalEnde: number;
  /** Anteil des Gewinns am Depotwert — treibt die Steuerlast. */
  gewinnanteil: number;
  /** Entnahme in heutiger Kaufkraft. */
  entnahmeNettoHeutigeKaufkraft: number;
}

export interface EntnahmeErgebnis {
  jahre: EntnahmeJahr[];
  /** Monate, bis das Kapital aufgebraucht ist; null, wenn es durchhält. */
  reichweiteMonate: number | null;
  /** Hält das Depot über den gesamten Betrachtungszeitraum? */
  traegtDurch: boolean;
  kapitalAmEnde: number;
  steuernGesamt: number;
  entnahmeBruttoGesamt: number;
  entnahmeNettoGesamt: number;
  /** Steuerquote über alle Entnahmen hinweg. */
  effektiveSteuerquote: number;
  hinweise: string[];
}

export function defaultEntnahmeEingabe(): EntnahmeEingabe {
  return {
    startkapital: 500_000,
    einstandswert: 300_000,
    entnahmeNettoMonat: 1_500,
    rendite: 5,
    inflation: 2,
    anlageart: 'aktienfonds',
    veranlagung: 'einzeln',
    dauerJahre: 30,
  };
}

interface Zustand {
  kapital: number;
  einstand: number;
}

/**
 * Entnimmt einen Bruttobetrag und schreibt den dabei realisierten Gewinn fort.
 * Verkauft werden Anteile anteilig, der Einstandswert sinkt im selben Verhältnis.
 */
function entnehmen(zustand: Zustand, brutto: number): number {
  if (zustand.kapital <= 0) return 0;
  const betrag = Math.min(brutto, zustand.kapital);
  const anteil = betrag / zustand.kapital;
  const einstandAnteil = zustand.einstand * anteil;
  zustand.kapital = cent(zustand.kapital - betrag);
  zustand.einstand = cent(zustand.einstand - einstandAnteil);
  return cent(betrag - einstandAnteil);
}

/** Steuer auf einen im Jahr realisierten Gewinn. */
function steuerAufGewinn(
  gewinn: number, eingabe: EntnahmeEingabe, lage: SteuerlicheLage,
): number {
  if (gewinn <= 0) return 0;
  const teilfrei = ANLAGEART_MAP[eingabe.anlageart].teilfreistellung;
  const steuerpflichtig = gewinn * (1 - teilfrei);
  const e = Math.max(0, steuerpflichtig - sparerPauschbetrag(eingabe.veranlagung));
  if (e <= 0) return 0;

  const k = lage.kirchensteuer ? BUNDESLAND_MAP[lage.bundesland].kirchensteuersatz : 0;
  const kapest = e / (4 + k);
  return cent(kapest * (1 + k + KAPITAL.soliSatz));
}

/** Simuliert ein Jahr mit vorgegebener Bruttoentnahme auf einer Kopie. */
function simuliereJahr(
  start: Zustand, bruttoJahr: number, eingabe: EntnahmeEingabe, lage: SteuerlicheLage,
): { zustand: Zustand; gewinn: number; steuern: number; netto: number; wertzuwachs: number } {
  const zustand: Zustand = { ...start };
  const monatsrendite = (1 + eingabe.rendite / 100) ** (1 / 12) - 1;
  const proMonat = bruttoJahr / 12;
  let gewinn = 0;
  let wertzuwachs = 0;

  for (let m = 0; m < 12; m++) {
    const zuwachs = cent(zustand.kapital * monatsrendite);
    zustand.kapital = cent(zustand.kapital + zuwachs);
    wertzuwachs = cent(wertzuwachs + zuwachs);
    gewinn = cent(gewinn + entnehmen(zustand, proMonat));
  }

  const steuern = steuerAufGewinn(gewinn, eingabe, lage);
  return { zustand, gewinn, steuern, netto: cent(bruttoJahr - steuern), wertzuwachs };
}

export function berechneEntnahme(
  eingabe: EntnahmeEingabe, lage: SteuerlicheLage,
): EntnahmeErgebnis {
  const jahre: EntnahmeJahr[] = [];
  const zustand: Zustand = {
    kapital: Math.max(0, eingabe.startkapital),
    // Der Einstandswert kann nicht über dem heutigen Wert liegen.
    einstand: Math.min(Math.max(0, eingabe.einstandswert), Math.max(0, eingabe.startkapital)),
  };

  const dauer = Math.max(1, Math.round(eingabe.dauerJahre));
  let reichweiteMonate: number | null = null;
  let steuernGesamt = 0;
  let bruttoGesamt = 0;
  let nettoGesamt = 0;

  for (let jahr = 1; jahr <= dauer; jahr++) {
    if (zustand.kapital <= 0.01) break;

    const kaufkraftfaktor = (1 + eingabe.inflation / 100) ** (jahr - 1);
    const zielNetto = cent(eingabe.entnahmeNettoMonat * 12 * kaufkraftfaktor);

    // Die nötige Bruttoentnahme hängt vom Gewinnanteil ab, der sich im Lauf
    // des Jahres selbst verändert — deshalb per Intervallhalbierung lösen.
    let unten = zielNetto;
    let oben = Math.max(zielNetto * 1.6, zielNetto + 1);
    for (let i = 0; i < 40; i++) {
      const mitte = (unten + oben) / 2;
      if (simuliereJahr(zustand, mitte, eingabe, lage).netto < zielNetto) unten = mitte;
      else oben = mitte;
    }
    const bruttoJahr = Math.min(cent(oben), zustand.kapital + simuliereJahr(zustand, 0, eingabe, lage).wertzuwachs);

    const kapitalAnfang = zustand.kapital;
    const lauf = simuliereJahr(zustand, bruttoJahr, eingabe, lage);
    zustand.kapital = lauf.zustand.kapital;
    zustand.einstand = lauf.zustand.einstand;

    steuernGesamt = cent(steuernGesamt + lauf.steuern);
    bruttoGesamt = cent(bruttoGesamt + bruttoJahr);
    nettoGesamt = cent(nettoGesamt + lauf.netto);

    jahre.push({
      jahr,
      kapitalAnfang,
      entnahmeBrutto: bruttoJahr,
      entnahmeNetto: lauf.netto,
      gewinn: lauf.gewinn,
      steuern: lauf.steuern,
      wertzuwachs: lauf.wertzuwachs,
      kapitalEnde: zustand.kapital,
      gewinnanteil: kapitalAnfang > 0 ? 1 - zustand.einstand / Math.max(zustand.kapital, 0.01) : 0,
      entnahmeNettoHeutigeKaufkraft: cent(lauf.netto / kaufkraftfaktor),
    });

    if (zustand.kapital <= 0.01 && reichweiteMonate === null) reichweiteMonate = jahr * 12;
  }

  const traegtDurch = zustand.kapital > 0.01 && jahre.length >= dauer;

  return {
    jahre,
    reichweiteMonate,
    traegtDurch,
    kapitalAmEnde: zustand.kapital,
    steuernGesamt,
    entnahmeBruttoGesamt: bruttoGesamt,
    entnahmeNettoGesamt: nettoGesamt,
    effektiveSteuerquote: bruttoGesamt > 0 ? steuernGesamt / bruttoGesamt : 0,
    hinweise: sammleHinweise(eingabe, jahre, traegtDurch, reichweiteMonate),
  };
}

function sammleHinweise(
  eingabe: EntnahmeEingabe,
  jahre: EntnahmeJahr[],
  traegtDurch: boolean,
  reichweiteMonate: number | null,
): string[] {
  const hinweise: string[] = [];

  if (!traegtDurch && reichweiteMonate !== null) {
    hinweise.push(
      `Das Kapital ist nach rund ${Math.round(reichweiteMonate / 12)} Jahren aufgebraucht — vor dem Ende des Betrachtungszeitraums von ${eingabe.dauerJahre} Jahren.`,
    );
  } else if (traegtDurch && jahre.length > 0) {
    const letztes = jahre[jahre.length - 1]!;
    if (letztes.kapitalEnde > eingabe.startkapital) {
      hinweise.push(
        'Das Depot wächst trotz der Entnahmen weiter: Die Rendite liegt über dem, was Sie herausnehmen.',
      );
    }
  }

  const erstes = jahre[0];
  const letztes = jahre[jahre.length - 1];
  if (erstes && letztes && letztes !== erstes && letztes.steuern > erstes.steuern) {
    hinweise.push(
      'Die Steuerlast steigt über die Jahre, obwohl die Entnahme gleich bleibt: Mit jedem Jahr steckt mehr Gewinn und weniger Einstandswert in den verkauften Anteilen.',
    );
  }

  if (eingabe.inflation > 0) {
    hinweise.push(
      `Die Entnahme steigt jährlich um ${eingabe.inflation} %, damit die Kaufkraft erhalten bleibt. Ohne diese Anpassung würde das Depot länger reichen — Ihr Lebensstandard aber sinken.`,
    );
  }

  hinweise.push(
    'Gerechnet wird mit einer gleichmäßigen Rendite. Echte Märkte schwanken, und schlechte Jahre zu Beginn der Entnahme wirken deutlich stärker als späte — planen Sie einen Puffer ein.',
  );

  return hinweise;
}

/**
 * Welches Startkapital nötig ist, damit die Entnahme den gesamten Zeitraum trägt.
 * Der Einstandswert wächst im selben Verhältnis mit.
 */
export function startkapitalFuer(
  eingabe: EntnahmeEingabe, lage: SteuerlicheLage,
): number {
  if (eingabe.entnahmeNettoMonat <= 0) return 0;
  const anteilEinstand = eingabe.startkapital > 0
    ? Math.min(1, eingabe.einstandswert / eingabe.startkapital)
    : 1;

  const traegt = (kapital: number) => berechneEntnahme({
    ...eingabe, startkapital: kapital, einstandswert: kapital * anteilEinstand,
  }, lage).traegtDurch;

  let unten = 0;
  let oben = Math.max(1, eingabe.entnahmeNettoMonat * 12 * eingabe.dauerJahre * 1.5);
  while (!traegt(oben) && oben < 1e11) oben *= 2;
  for (let i = 0; i < 44; i++) {
    const mitte = (unten + oben) / 2;
    if (traegt(mitte)) oben = mitte;
    else unten = mitte;
  }
  return cent(oben);
}
