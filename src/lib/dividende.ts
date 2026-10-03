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
 */

import {
  ANLAGEART_MAP, BUNDESLAND_MAP, KAPITAL,
  type Anlageart, type BundeslandCode,
} from './constants';
import { eur } from './format';
import { cent } from './sozialversicherung';

export type Veranlagung = 'einzeln' | 'zusammen';
export type Eingabeart = 'betrag' | 'portfolio';

export interface DividendenEingabe {
  eingabeart: Eingabeart;
  /** Bruttodividende pro Jahr, wenn direkt eingegeben. */
  bruttoJahr: number;
  /** Depotwert, wenn über Portfolio und Rendite gerechnet wird. */
  portfolio: number;
  /** Dividendenrendite des Portfolios in Prozent. */
  rendite: number;
  veranlagung: Veranlagung;
  /** Anderweitig bereits verbrauchter Sparer-Pauschbetrag, Euro. */
  pauschbetragVerbraucht: number;
  anlageart: Anlageart;
  /** Im Ausland einbehaltene Quellensteuer in Prozent (nur bei Einzelaktien). */
  quellensteuerProzent: number;
  /** Anrechnungshöchstsatz nach Doppelbesteuerungsabkommen, in Prozent. */
  anrechnungshoechstsatz: number;
}

/** Persönliche Merkmale, die aus den übrigen Rechnern übernommen werden. */
export interface SteuerlicheLage {
  kirchensteuer: boolean;
  bundesland: BundeslandCode;
}

export interface DividendenErgebnis {
  bruttoJahr: number;
  bruttoMonat: number;
  /** Depotwert — berechnet oder eingegeben, sofern bekannt. */
  portfolio: number | null;
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
    portfolio: 100_000,
    rendite: 3,
    veranlagung: 'einzeln',
    pauschbetragVerbraucht: 0,
    anlageart: 'aktienfonds',
    quellensteuerProzent: 0,
    anrechnungshoechstsatz: KAPITAL.quellensteuerAnrechnungStandard,
  };
}

/** Bruttodividende aus der gewählten Eingabeart. */
export function bruttodividende(eingabe: DividendenEingabe): number {
  if (eingabe.eingabeart === 'portfolio') {
    return cent(Math.max(0, eingabe.portfolio) * (Math.max(0, eingabe.rendite) / 100));
  }
  return cent(Math.max(0, eingabe.bruttoJahr));
}

export function sparerPauschbetrag(veranlagung: Veranlagung): number {
  return veranlagung === 'zusammen'
    ? KAPITAL.sparerPauschbetragZusammen
    : KAPITAL.sparerPauschbetrag;
}

export function berechneDividende(
  eingabe: DividendenEingabe,
  lage: SteuerlicheLage,
): DividendenErgebnis {
  const brutto = bruttodividende(eingabe);
  const art = ANLAGEART_MAP[eingabe.anlageart];
  const k = lage.kirchensteuer ? BUNDESLAND_MAP[lage.bundesland].kirchensteuersatz : 0;

  // Ausländische Quellensteuer gibt es nur bei direkt gehaltenen Papieren;
  // in Fonds wird sie bereits auf Fondsebene verrechnet.
  const qstSatz = eingabe.anlageart === 'aktien' ? Math.max(0, eingabe.quellensteuerProzent) : 0;
  const quellensteuer = cent(brutto * (qstSatz / 100));
  const anrechenbarNachDba = cent(
    brutto * (Math.min(qstSatz, Math.max(0, eingabe.anrechnungshoechstsatz)) / 100),
  );

  const teilfreigestellt = cent(brutto * art.teilfreistellung);
  const ertragSteuerpflichtig = cent(brutto - teilfreigestellt);

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

  const portfolio = eingabe.eingabeart === 'portfolio'
    ? Math.max(0, eingabe.portfolio)
    : (eingabe.rendite > 0 ? cent(brutto / (eingabe.rendite / 100)) : null);

  return {
    bruttoJahr: brutto,
    bruttoMonat: cent(brutto / 12),
    portfolio,
    teilfreistellungssatz: art.teilfreistellung,
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
      brutto, genutzt, verfuegbar, e, quellensteuer, angerechnet, teilfreistellung: art.teilfreistellung,
    }),
  };
}

function sammleHinweise(
  eingabe: DividendenEingabe,
  w: {
    brutto: number; genutzt: number; verfuegbar: number; e: number;
    quellensteuer: number; angerechnet: number; teilfreistellung: number;
  },
): string[] {
  const hinweise: string[] = [];

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
      `${Math.round(w.teilfreistellung * 100)} % der Erträge bleiben durch die Teilfreistellung nach § 20 InvStG von vornherein steuerfrei — sie gleicht die Steuer aus, die der Fonds bereits selbst zahlt.`,
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
export function bruttoFuerNetto(
  zielNettoJahr: number,
  eingabe: DividendenEingabe,
  lage: SteuerlicheLage,
): number {
  if (zielNettoJahr <= 0) return 0;

  const netto = (brutto: number) =>
    berechneDividende({ ...eingabe, eingabeart: 'betrag', bruttoJahr: brutto }, lage).nettoJahr;

  let unten = 0;
  let oben = Math.max(1, zielNettoJahr * 3);
  while (netto(oben) < zielNettoJahr && oben < 1e12) oben *= 2;

  for (let i = 0; i < 60; i++) {
    const mitte = (unten + oben) / 2;
    if (netto(mitte) < zielNettoJahr) unten = mitte;
    else oben = mitte;
  }
  return cent(oben);
}

/** Depotwert, der für ein gewünschtes Monatsnetto nötig ist. */
export function portfolioFuerNetto(
  zielNettoMonat: number,
  eingabe: DividendenEingabe,
  lage: SteuerlicheLage,
): number | null {
  if (eingabe.rendite <= 0) return null;
  const brutto = bruttoFuerNetto(zielNettoMonat * 12, eingabe, lage);
  return cent(brutto / (eingabe.rendite / 100));
}
