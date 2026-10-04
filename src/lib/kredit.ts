/**
 * Annuitätendarlehen: Tilgungsplan, Restschuld und Zinslast.
 *
 * Die Rate bleibt gleich; mit sinkender Restschuld fällt der Zinsanteil und
 * steigt die Tilgung. Entscheidend für Immobilienkredite in Deutschland ist,
 * was am Ende der Zinsbindung übrig bleibt — diese Restschuld muss dann zu
 * einem heute unbekannten Zins neu finanziert werden.
 */

import { cent } from './sozialversicherung';

export type Tilgungsart = 'tilgungssatz' | 'rate';

export interface KreditEingabe {
  /** Darlehensbetrag in Euro. */
  darlehen: number;
  /** Nominaler Sollzins pro Jahr in Prozent. */
  sollzins: number;
  tilgungsart: Tilgungsart;
  /** Anfängliche Tilgung pro Jahr in Prozent. */
  anfangstilgung: number;
  /** Monatsrate in Euro, wenn direkt vorgegeben. */
  rate: number;
  /** Dauer der Zinsbindung in Jahren. */
  zinsbindung: number;
  /** Jährliche Sondertilgung in Euro, fällig zum Jahresende. */
  sondertilgung: number;
  /** Angenommener Zins nach Ablauf der Zinsbindung, in Prozent. */
  anschlusszins: number;
}

export interface KreditJahr {
  jahr: number;
  restschuldAnfang: number;
  zins: number;
  tilgung: number;
  sondertilgung: number;
  restschuldEnde: number;
  /** Lief dieses Jahr noch in der Zinsbindung? */
  inZinsbindung: boolean;
  /** Zinssatz, der in diesem Jahr galt. */
  satz: number;
}

export interface KreditErgebnis {
  monatsrate: number;
  /** Anfängliche Tilgung in Prozent — auch wenn die Rate vorgegeben wurde. */
  anfangstilgung: number;
  /** Effektiver Jahreszins aus monatlicher Verzinsung, ohne Nebenkosten. */
  effektivzins: number;
  /** Gesamtlaufzeit in Monaten; null, wenn die Rate die Zinsen nicht deckt. */
  laufzeitMonate: number | null;
  restschuldNachBindung: number;
  /** Anteil des Darlehens, der bis zum Ende der Zinsbindung getilgt ist. */
  getilgtBisBindung: number;
  zinsenBisBindung: number;
  zinsenGesamt: number;
  summeSondertilgung: number;
  /** Summe aller Zahlungen über die gesamte Laufzeit. */
  zahlungenGesamt: number;
  jahre: KreditJahr[];
  hinweise: string[];
}

/** Längste Laufzeit, die simuliert wird — darüber hinaus trägt kein Darlehen. */
const MAX_MONATE = 50 * 12;

export function defaultKreditEingabe(): KreditEingabe {
  return {
    darlehen: 350_000,
    sollzins: 3.6,
    tilgungsart: 'tilgungssatz',
    anfangstilgung: 2,
    rate: 1_700,
    zinsbindung: 10,
    sondertilgung: 0,
    anschlusszins: 4.5,
  };
}

/** Monatsrate aus Darlehen, Sollzins und anfänglicher Tilgung. */
export function annuitaet(darlehen: number, sollzins: number, anfangstilgung: number): number {
  return cent((darlehen * (sollzins + anfangstilgung)) / 100 / 12);
}

/**
 * Effektiver Jahreszins allein aus der monatlichen Verzinsung.
 * Nebenkosten wie Disagio oder Bearbeitungsgebühren sind nicht enthalten.
 */
export function effektivzins(sollzins: number): number {
  return (1 + sollzins / 100 / 12) ** 12 - 1;
}

export function berechneKredit(eingabe: KreditEingabe): KreditErgebnis {
  const darlehen = Math.max(0, eingabe.darlehen);
  const zinsbindungMonate = Math.max(0, Math.round(eingabe.zinsbindung * 12));

  const rate = eingabe.tilgungsart === 'rate'
    ? Math.max(0, eingabe.rate)
    : annuitaet(darlehen, eingabe.sollzins, eingabe.anfangstilgung);

  const erstesJahrZins = (darlehen * eingabe.sollzins) / 100;
  const anfangstilgung = darlehen > 0 ? ((rate * 12 - erstesJahrZins) / darlehen) * 100 : 0;

  const jahre: KreditJahr[] = [];
  const hinweise: string[] = [];

  let rest = darlehen;
  let monat = 0;
  let zinsenGesamt = 0;
  let zinsenBisBindung = 0;
  let summeSondertilgung = 0;
  let zahlungenGesamt = 0;
  let restschuldNachBindung = darlehen;

  let jahrZins = 0;
  let jahrTilgung = 0;
  let jahrSonder = 0;
  let jahrAnfang = darlehen;
  let laufzeitMonate: number | null = null;

  while (rest > 0.005 && monat < MAX_MONATE) {
    const inBindung = monat < zinsbindungMonate;
    const satz = inBindung ? eingabe.sollzins : eingabe.anschlusszins;
    const zins = cent((rest * satz) / 100 / 12);

    // Deckt die Rate nicht einmal die Zinsen, wächst die Schuld — dann ist
    // der Plan nicht tragfähig und die Simulation bricht ab.
    if (rate <= zins) {
      hinweise.push(
        'Die Rate deckt nicht einmal die Zinsen — die Restschuld würde wachsen statt zu sinken. Erhöhen Sie die Rate oder die anfängliche Tilgung.',
      );
      break;
    }

    const tilgung = Math.min(cent(rate - zins), rest);
    rest = cent(rest - tilgung);
    monat += 1;

    zinsenGesamt = cent(zinsenGesamt + zins);
    zahlungenGesamt = cent(zahlungenGesamt + zins + tilgung);
    jahrZins = cent(jahrZins + zins);
    jahrTilgung = cent(jahrTilgung + tilgung);
    if (inBindung) zinsenBisBindung = cent(zinsenBisBindung + zins);

    // Sondertilgung zum Jahresende
    if (monat % 12 === 0 && eingabe.sondertilgung > 0 && rest > 0) {
      const sonder = Math.min(eingabe.sondertilgung, rest);
      rest = cent(rest - sonder);
      jahrSonder = cent(jahrSonder + sonder);
      summeSondertilgung = cent(summeSondertilgung + sonder);
      zahlungenGesamt = cent(zahlungenGesamt + sonder);
    }

    if (monat === zinsbindungMonate) restschuldNachBindung = rest;

    if (monat % 12 === 0 || rest <= 0.005) {
      jahre.push({
        jahr: Math.ceil(monat / 12),
        restschuldAnfang: jahrAnfang,
        zins: jahrZins,
        tilgung: jahrTilgung,
        sondertilgung: jahrSonder,
        restschuldEnde: rest,
        inZinsbindung: monat <= zinsbindungMonate,
        satz: inBindung ? eingabe.sollzins : eingabe.anschlusszins,
      });
      jahrAnfang = rest;
      jahrZins = 0;
      jahrTilgung = 0;
      jahrSonder = 0;
    }
  }

  if (rest <= 0.005) {
    laufzeitMonate = monat;
  } else if (hinweise.length === 0 && monat >= MAX_MONATE) {
    // Woran es liegt, hängt davon ab, ob die Zinsbindung schon vorbei war:
    // Nach der Bindung frisst ein höherer Zins die Tilgung auf, obwohl die
    // Rate am Anfang auskömmlich war.
    const nachBindung = zinsbindungMonate > 0 && eingabe.anschlusszins > eingabe.sollzins;
    hinweise.push(
      nachBindung
        ? `Mit ${eingabe.anschlusszins} % Anschlusszins ist das Darlehen bei gleichbleibender Rate auch nach 50 Jahren nicht getilgt — der höhere Zins zehrt die Tilgung fast vollständig auf. Nach der Zinsbindung müssten Sie die Rate erhöhen.`
        : 'Das Darlehen ist nach 50 Jahren noch nicht getilgt — die Tilgung ist zu niedrig angesetzt.',
    );
  }

  if (zinsbindungMonate > 0 && (laufzeitMonate === null || laufzeitMonate > zinsbindungMonate)) {
    const getilgt = darlehen > 0 ? 1 - restschuldNachBindung / darlehen : 0;
    hinweise.push(
      `Nach ${eingabe.zinsbindung} Jahren Zinsbindung sind erst ${Math.round(getilgt * 100)} % getilgt. Die Restschuld von ${restschuldNachBindung.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })} muss dann zu einem heute unbekannten Zins neu finanziert werden — der angenommene Anschlusszins ist der größte Unsicherheitsfaktor dieser Rechnung.`,
    );
  }

  if (eingabe.sondertilgung > 0 && laufzeitMonate !== null) {
    const ohne = berechneKredit({ ...eingabe, sondertilgung: 0 });
    if (ohne.laufzeitMonate !== null) {
      const gespart = cent(ohne.zinsenGesamt - zinsenGesamt);
      const kuerzer = ohne.laufzeitMonate - laufzeitMonate;
      hinweise.push(
        `Die Sondertilgung verkürzt die Laufzeit um ${Math.floor(kuerzer / 12)} Jahre und ${kuerzer % 12} Monate und spart ${gespart.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })} Zinsen.`,
      );
    }
  }

  return {
    monatsrate: rate,
    anfangstilgung: Math.round(anfangstilgung * 100) / 100,
    effektivzins: effektivzins(eingabe.sollzins),
    laufzeitMonate,
    restschuldNachBindung: zinsbindungMonate === 0 ? darlehen : restschuldNachBindung,
    getilgtBisBindung: darlehen > 0 ? 1 - restschuldNachBindung / darlehen : 0,
    zinsenBisBindung,
    zinsenGesamt,
    summeSondertilgung,
    zahlungenGesamt,
    jahre,
    hinweise,
  };
}

/** Welche anfängliche Tilgung nötig ist, um in n Jahren schuldenfrei zu sein. */
export function tilgungFuerLaufzeit(
  darlehen: number, sollzins: number, jahre: number,
): number {
  if (darlehen <= 0 || jahre <= 0) return 0;
  const i = sollzins / 100 / 12;
  const n = jahre * 12;
  // Annuitätenformel nach der Rate aufgelöst, dann in einen Tilgungssatz zurück.
  const rate = i === 0 ? darlehen / n : (darlehen * i) / (1 - (1 + i) ** -n);
  return Math.round(((rate * 12) / darlehen * 100 - sollzins) * 100) / 100;
}
