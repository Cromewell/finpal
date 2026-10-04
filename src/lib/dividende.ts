/**
 * Dividenden von brutto auf netto — Abgeltungsteuer für Privatanleger.
 *
 * Gerechnet wird nach der gesetzlichen Formel des § 32d Abs. 1 EStG:
 *
 *     Kapitalertragsteuer = (e − 4q) / (4 + k)
 *
 * mit e = steuerpflichtiger Ertrag, q = anrechenbare ausländische Steuer und
 * k = Kirchensteuersatz. Die oft zu lesende Rechnung „25 % plus Soli plus
 * Kirchensteuer“ ist zu hoch: Weil die Kirchensteuer als Sonderausgabe
 * abziehbar ist, mindert sie die Kapitalertragsteuer selbst.
 *
 * Ein Depot kann aus mehreren Positionen bestehen — etwa 70 % Aktien-ETF und
 * 30 % Einzelaktien. Teilfreistellung und ausländische Quellensteuer gelten je
 * Position; der Sparer-Pauschbetrag dagegen nur einmal für alles zusammen.
 */

import {
  ANLAGEART_MAP, BUNDESLAND_MAP, KAPITAL,
  type Anlageart, type BundeslandCode,
} from './constants';
import { eur } from './format';
import { cent } from './sozialversicherung';

export type Veranlagung = 'einzeln' | 'zusammen';
export type Eingabeart = 'betrag' | 'portfolio';

export interface Depotposition {
  id: string;
  name: string;
  /** Anteil am Depotwert in Prozent. */
  anteil: number;
  /** Dividendenrendite dieser Position in Prozent. */
  rendite: number;
  anlageart: Anlageart;
  /** Im Ausland einbehaltene Quellensteuer in Prozent (nur bei Einzelaktien). */
  quellensteuerProzent: number;
}

export interface DividendenEingabe {
  eingabeart: Eingabeart;
  /** Bruttodividende pro Jahr, wenn direkt eingegeben. */
  bruttoJahr: number;
  /** Anlageart im Modus „Betrag“. */
  anlageart: Anlageart;
  /** Quellensteuer im Modus „Betrag“, in Prozent. */
  quellensteuerProzent: number;
  /** Depotwert im Modus „Depot & Rendite“. */
  portfolio: number;
  /** Zusammensetzung des Depots. */
  positionen: Depotposition[];
  veranlagung: Veranlagung;
  /** Anderweitig bereits verbrauchter Sparer-Pauschbetrag, Euro. */
  pauschbetragVerbraucht: number;
  /** Anrechnungshöchstsatz nach Doppelbesteuerungsabkommen, in Prozent. */
  anrechnungshoechstsatz: number;
}

/** Persönliche Merkmale, die aus den übrigen Rechnern übernommen werden. */
export interface SteuerlicheLage {
  kirchensteuer: boolean;
  bundesland: BundeslandCode;
}

export interface PositionErgebnis {
  id: string;
  name: string;
  anlageart: Anlageart;
  /** Anteil am Depot in Prozent; im Modus „Betrag“ immer 100. */
  anteil: number;
  /** Auf diese Position entfallender Depotwert, sofern bekannt. */
  depotwert: number | null;
  rendite: number | null;
  bruttoJahr: number;
  teilfreistellungssatz: number;
  teilfreigestellt: number;
  /** Steuerpflichtiger Ertrag dieser Position vor dem Pauschbetrag. */
  steuerpflichtig: number;
  quellensteuer: number;
  /** Davon nach Doppelbesteuerungsabkommen grundsätzlich anrechenbar. */
  quellensteuerAnrechenbar: number;
}

export interface DividendenErgebnis {
  positionen: PositionErgebnis[];
  bruttoJahr: number;
  bruttoMonat: number;
  /** Depotwert — eingegeben oder zurückgerechnet, sofern bekannt. */
  portfolio: number | null;
  /** Gewichtete Dividendenrendite über alle Positionen, in Prozent. */
  mischrendite: number | null;
  /** Summe der eingetragenen Anteile in Prozent — sollte 100 ergeben. */
  anteilSumme: number;
  /** Wirksame Teilfreistellung über alle Positionen hinweg. */
  teilfreistellungssatz: number;
  teilfreigestellt: number;
  /** Steuerpflichtiger Ertrag vor Abzug des Sparer-Pauschbetrags. */
  ertragSteuerpflichtig: number;
  pauschbetrag: number;
  pauschbetragGenutzt: number;
  pauschbetragRest: number;
  /** Bemessungsgrundlage nach Teilfreistellung und Pauschbetrag — das „e“. */
  bemessungsgrundlage: number;
  /** Im Ausland tatsächlich einbehaltene Quellensteuer. */
  quellensteuer: number;
  quellensteuerAngerechnet: number;
  /** Nicht angerechneter Teil — nur im Ausland zurückzuholen. */
  quellensteuerVerloren: number;
  kapitalertragsteuer: number;
  soli: number;
  kirchensteuer: number;
  kirchensteuersatz: number;
  /** Alle Steuern zusammen, einschließlich der ausländischen Quellensteuer. */
  steuernGesamt: number;
  nettoJahr: number;
  nettoMonat: number;
  /** Steuern geteilt durch Bruttodividende. */
  effektiverSteuersatz: number;
  /** Nettodividende bezogen auf den Depotwert. */
  nettoRendite: number | null;
  hinweise: string[];
}

export function defaultDividendenEingabe(): DividendenEingabe {
  return {
    eingabeart: 'portfolio',
    bruttoJahr: 3_000,
    anlageart: 'aktienfonds',
    quellensteuerProzent: 0,
    portfolio: 100_000,
    positionen: [
      {
        id: 'p-etf', name: 'Aktien-ETF', anteil: 70, rendite: 2.5,
        anlageart: 'aktienfonds', quellensteuerProzent: 0,
      },
      {
        id: 'p-aktien', name: 'Einzelaktien', anteil: 30, rendite: 3.8,
        anlageart: 'aktien', quellensteuerProzent: 15,
      },
    ],
    veranlagung: 'einzeln',
    pauschbetragVerbraucht: 0,
    anrechnungshoechstsatz: KAPITAL.quellensteuerAnrechnungStandard,
  };
}

export function sparerPauschbetrag(veranlagung: Veranlagung): number {
  return veranlagung === 'zusammen'
    ? KAPITAL.sparerPauschbetragZusammen
    : KAPITAL.sparerPauschbetrag;
}

/** Summe der eingetragenen Anteile in Prozent. */
export function anteilSumme(positionen: Depotposition[]): number {
  return Math.round(positionen.reduce((s, p) => s + Math.max(0, p.anteil), 0) * 100) / 100;
}

/**
 * Zerlegt die Eingabe in Positionen mit konkreten Beträgen.
 * Im Modus „Betrag“ entsteht genau eine Position.
 */
function zerlege(eingabe: DividendenEingabe, hoechstsatz: number): PositionErgebnis[] {
  const bauen = (
    teil: {
      id: string; name: string; anlageart: Anlageart; anteil: number;
      depotwert: number | null; rendite: number | null;
      brutto: number; quellensteuerProzent: number;
    },
  ): PositionErgebnis => {
    const art = ANLAGEART_MAP[teil.anlageart];
    const teilfreigestellt = cent(teil.brutto * art.teilfreistellung);
    // Ausländische Quellensteuer gibt es nur bei direkt gehaltenen Papieren;
    // in Fonds wird sie bereits auf Fondsebene verrechnet.
    const qstSatz = teil.anlageart === 'aktien' ? Math.max(0, teil.quellensteuerProzent) : 0;
    return {
      id: teil.id,
      name: teil.name,
      anlageart: teil.anlageart,
      anteil: teil.anteil,
      depotwert: teil.depotwert,
      rendite: teil.rendite,
      bruttoJahr: teil.brutto,
      teilfreistellungssatz: art.teilfreistellung,
      teilfreigestellt,
      steuerpflichtig: cent(teil.brutto - teilfreigestellt),
      quellensteuer: cent(teil.brutto * (qstSatz / 100)),
      quellensteuerAnrechenbar: cent(teil.brutto * (Math.min(qstSatz, hoechstsatz) / 100)),
    };
  };

  if (eingabe.eingabeart === 'betrag') {
    return [bauen({
      id: 'betrag',
      name: ANLAGEART_MAP[eingabe.anlageart].name,
      anlageart: eingabe.anlageart,
      anteil: 100,
      depotwert: null,
      rendite: null,
      brutto: cent(Math.max(0, eingabe.bruttoJahr)),
      quellensteuerProzent: eingabe.quellensteuerProzent,
    })];
  }

  const depot = Math.max(0, eingabe.portfolio);
  return eingabe.positionen.map((p) => {
    const anteil = Math.max(0, p.anteil);
    const wert = cent(depot * (anteil / 100));
    return bauen({
      id: p.id,
      name: p.name,
      anlageart: p.anlageart,
      anteil,
      depotwert: wert,
      rendite: Math.max(0, p.rendite),
      brutto: cent(wert * (Math.max(0, p.rendite) / 100)),
      quellensteuerProzent: p.quellensteuerProzent,
    });
  });
}

/** Bruttodividende aus der gewählten Eingabeart. */
export function bruttodividende(eingabe: DividendenEingabe): number {
  return cent(
    zerlege(eingabe, eingabe.anrechnungshoechstsatz).reduce((s, p) => s + p.bruttoJahr, 0),
  );
}

export function berechneDividende(
  eingabe: DividendenEingabe,
  lage: SteuerlicheLage,
): DividendenErgebnis {
  const hoechstsatz = Math.max(0, eingabe.anrechnungshoechstsatz);
  const positionen = zerlege(eingabe, hoechstsatz);
  const k = lage.kirchensteuer ? BUNDESLAND_MAP[lage.bundesland].kirchensteuersatz : 0;

  const summe = (hole: (p: PositionErgebnis) => number) =>
    cent(positionen.reduce((s, p) => s + hole(p), 0));

  const brutto = summe((p) => p.bruttoJahr);
  const teilfreigestellt = summe((p) => p.teilfreigestellt);
  const ertragSteuerpflichtig = summe((p) => p.steuerpflichtig);
  const quellensteuer = summe((p) => p.quellensteuer);
  const anrechenbarNachDba = summe((p) => p.quellensteuerAnrechenbar);

  // Der Sparer-Pauschbetrag gilt einmal für alle Kapitalerträge zusammen,
  // nicht je Position.
  const pauschbetrag = sparerPauschbetrag(eingabe.veranlagung);
  const verfuegbar = Math.max(0, pauschbetrag - Math.max(0, eingabe.pauschbetragVerbraucht));
  const genutzt = cent(Math.min(ertragSteuerpflichtig, verfuegbar));
  const e = cent(ertragSteuerpflichtig - genutzt);

  // Angerechnet wird höchstens so viel, dass die Kapitalertragsteuer nicht
  // unter null fällt (§ 32d Abs. 5 EStG). Der Rest ist im Inland verloren.
  const angerechnet = cent(Math.min(anrechenbarNachDba, e / 4));
  const kapitalertragsteuer = cent(Math.max(0, (e - 4 * angerechnet) / (4 + k)));
  const kirchensteuer = cent(kapitalertragsteuer * k);
  const soli = cent(kapitalertragsteuer * KAPITAL.soliSatz);

  const deutscheSteuer = cent(kapitalertragsteuer + kirchensteuer + soli);
  const steuernGesamt = cent(deutscheSteuer + quellensteuer);
  const nettoJahr = cent(brutto - steuernGesamt);

  const anteile = eingabe.eingabeart === 'portfolio' ? anteilSumme(eingabe.positionen) : 100;
  const portfolio = eingabe.eingabeart === 'portfolio'
    ? Math.max(0, eingabe.portfolio)
    : null;

  return {
    positionen,
    bruttoJahr: brutto,
    bruttoMonat: cent(brutto / 12),
    portfolio,
    mischrendite: portfolio && portfolio > 0
      ? Math.round((brutto / portfolio) * 10_000) / 100
      : null,
    anteilSumme: anteile,
    teilfreistellungssatz: brutto > 0 ? teilfreigestellt / brutto : 0,
    teilfreigestellt,
    ertragSteuerpflichtig,
    pauschbetrag,
    pauschbetragGenutzt: genutzt,
    pauschbetragRest: cent(verfuegbar - genutzt),
    bemessungsgrundlage: e,
    quellensteuer,
    quellensteuerAngerechnet: angerechnet,
    quellensteuerVerloren: cent(quellensteuer - angerechnet),
    kapitalertragsteuer,
    soli,
    kirchensteuer,
    kirchensteuersatz: k,
    steuernGesamt,
    nettoJahr,
    nettoMonat: cent(nettoJahr / 12),
    effektiverSteuersatz: brutto > 0 ? steuernGesamt / brutto : 0,
    nettoRendite: portfolio && portfolio > 0 ? nettoJahr / portfolio : null,
    hinweise: sammleHinweise(eingabe, {
      brutto, genutzt, verfuegbar, e, quellensteuer, angerechnet,
      teilfreistellung: brutto > 0 ? teilfreigestellt / brutto : 0,
      anteile,
    }),
  };
}

function sammleHinweise(
  eingabe: DividendenEingabe,
  w: {
    brutto: number; genutzt: number; verfuegbar: number; e: number;
    quellensteuer: number; angerechnet: number; teilfreistellung: number; anteile: number;
  },
): string[] {
  const hinweise: string[] = [];

  if (eingabe.eingabeart === 'portfolio' && Math.abs(w.anteile - 100) > 0.01) {
    hinweise.push(
      w.anteile < 100
        ? `Die Anteile ergeben zusammen ${w.anteile} % — die fehlenden ${Math.round((100 - w.anteile) * 100) / 100} % des Depots bringen in dieser Rechnung keine Dividende. Das passt, wenn dort Anleihen, Gold oder Tagesgeld liegen; sonst fehlt eine Position.`
        : `Die Anteile ergeben zusammen ${w.anteile} % und damit mehr als das ganze Depot. Die Rechnung setzt die Beträge trotzdem an — prüfen Sie die Aufteilung.`,
    );
  }

  if (w.brutto > 0 && w.e === 0) {
    // Nur „steuerfrei“ nennen, wenn auch im Ausland nichts einbehalten wurde —
    // sonst widerspricht der Hinweis der Tabelle darüber.
    hinweise.push(
      w.quellensteuer > 0
        ? 'Im Inland fällt keine Steuer an — der Sparer-Pauschbetrag deckt die Dividende vollständig ab. Die im Ausland einbehaltene Quellensteuer bleibt davon unberührt.'
        : 'Die gesamte Dividende bleibt steuerfrei — der Sparer-Pauschbetrag deckt sie ab. Achten Sie darauf, bei Ihrer Bank einen Freistellungsauftrag zu hinterlegen, sonst wird trotzdem einbehalten und Sie holen es sich erst über die Steuererklärung zurück.',
    );
  } else if (w.genutzt > 0 && w.genutzt >= w.verfuegbar && w.verfuegbar > 0) {
    hinweise.push(
      'Der Sparer-Pauschbetrag ist mit dieser Dividende vollständig ausgeschöpft. Jeder weitere Euro Kapitalertrag wird voll besteuert.',
    );
  }

  if (w.quellensteuer > 0 && w.quellensteuer > w.angerechnet) {
    const grund = w.e === 0
      ? ' Weil im Inland keine Kapitalertragsteuer anfällt, gibt es nichts, worauf angerechnet werden könnte.'
      : '';
    hinweise.push(
      `Von ${eur(w.quellensteuer)} ausländischer Quellensteuer werden nur ${eur(w.angerechnet)} im Inland angerechnet.${grund} Den Rest müssten Sie sich im Quellenstaat erstatten lassen — das lohnt sich oft erst ab größeren Beträgen.`,
    );
  }

  if (w.teilfreistellung > 0) {
    hinweise.push(
      `Über alle Positionen hinweg bleiben ${(w.teilfreistellung * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} % der Erträge durch die Teilfreistellung nach § 20 InvStG von vornherein steuerfrei — sie gleicht die Steuer aus, die der Fonds bereits selbst zahlt.`,
    );
  }

  if (eingabe.veranlagung === 'zusammen') {
    hinweise.push(
      'Der doppelte Pauschbetrag von 2.000 € setzt voraus, dass Sie zusammen veranlagt werden und einen gemeinsamen Freistellungsauftrag erteilt haben.',
    );
  }

  return hinweise;
}

/**
 * Welche Bruttodividende nötig ist, um ein gewünschtes Netto zu erreichen.
 *
 * Der Verlauf ist stückweise linear (steuerfrei bis zum Pauschbetrag, danach
 * konstanter Satz) und streng monoton — ein Intervallhalbierungsverfahren
 * findet die Umkehrung zuverlässig, ohne jede Verzweigung einzeln aufzulösen.
 */
function loeseMonoton(ziel: number, netto: (wert: number) => number): number {
  if (ziel <= 0) return 0;
  let unten = 0;
  let oben = Math.max(1, ziel * 3);
  while (netto(oben) < ziel && oben < 1e12) oben *= 2;
  for (let i = 0; i < 60; i++) {
    const mitte = (unten + oben) / 2;
    if (netto(mitte) < ziel) unten = mitte;
    else oben = mitte;
  }
  return cent(oben);
}

export function bruttoFuerNetto(
  zielNettoJahr: number,
  eingabe: DividendenEingabe,
  lage: SteuerlicheLage,
): number {
  return loeseMonoton(zielNettoJahr, (brutto) =>
    berechneDividende({ ...eingabe, eingabeart: 'betrag', bruttoJahr: brutto }, lage).nettoJahr);
}

/**
 * Depotwert, der für ein gewünschtes Monatsnetto nötig ist — bei unveränderter
 * Aufteilung des Depots. Alle Positionen wachsen anteilig mit.
 */
export function portfolioFuerNetto(
  zielNettoMonat: number,
  eingabe: DividendenEingabe,
  lage: SteuerlicheLage,
): number | null {
  if (eingabe.eingabeart !== 'portfolio') return null;
  const probe = berechneDividende({ ...eingabe, portfolio: 100_000 }, lage);
  if (probe.bruttoJahr <= 0) return null;
  return loeseMonoton(zielNettoMonat * 12, (depot) =>
    berechneDividende({ ...eingabe, portfolio: depot }, lage).nettoJahr);
}
