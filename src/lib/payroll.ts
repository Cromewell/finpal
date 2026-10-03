/**
 * Vollständige Entgeltabrechnung: Lohnsteuer (amtlicher PAP),
 * Solidaritätszuschlag, Kirchensteuer und Sozialversicherung.
 *
 * Alles rein rechnerisch, ohne Netzwerkzugriff.
 */

import Lohnsteuer2026 from './lohnsteuer2026.generated.js';
import BigDecimal from './bigdecimal';
import {
  BUNDESLAND_MAP, JAHR, SV,
  type BundeslandCode, type Steuerklasse,
} from './constants';
import {
  berechneSozialversicherung, cent,
  type KvTyp, type SvResult,
} from './sozialversicherung';

export interface PayrollInput {
  /** Monatliches Bruttoentgelt in Euro. */
  bruttoMonat: number;
  steuerklasse: Steuerklasse;
  bundesland: BundeslandCode;
  /** Mitglied einer steuererhebenden Religionsgemeinschaft. */
  kirchensteuer: boolean;
  /** Zahl der Kinderfreibeträge (nur Steuerklassen I–IV), z. B. 0, 0.5, 1, 2. */
  kinderfreibetraege: number;
  kvTyp: KvTyp;
  /** Kassenindividueller Zusatzbeitragssatz in Prozent (voller Satz). */
  zusatzbeitrag: number;
  pkvKrankenMonat: number;
  pkvPflegeMonat: number;
  rvPflicht: boolean;
  avPflicht: boolean;
  /** Kinderlos und mindestens 23 — Zuschlag zur Pflegeversicherung. */
  kinderlos: boolean;
  /** Beitragsabschläge Pflegeversicherung (Kinder unter 25 ab dem zweiten), 0–4. */
  pvAbschlaege: 0 | 1 | 2 | 3 | 4;
  /** Jährlicher Steuerfreibetrag aus einem Lohnsteuer-Ermäßigungsantrag, Euro. */
  freibetragJahr: number;
  /** Jährlicher Hinzurechnungsbetrag, Euro. */
  hinzurechnungJahr: number;
  /** Steuerklasse IV mit Faktor: Faktor < 1 aus dem Finanzamtsbescheid. */
  faktor: number | null;
  /** Geburtsjahr — nur für den Altersentlastungsbetrag relevant. */
  geburtsjahr: number | null;
  /** Im Minijob: Befreiung von der Rentenversicherungspflicht beantragt. */
  minijobRvBefreiung: boolean;
}

export interface Posten {
  monat: number;
  jahr: number;
}

export interface PayrollResult {
  eingabe: PayrollInput;
  brutto: Posten;
  lohnsteuer: Posten;
  soli: Posten;
  kirchensteuer: Posten;
  steuern: Posten;
  sv: SvResult;
  svAn: Posten;
  /** Private Kranken-/Pflegeprämie nach Arbeitgeberzuschuss. */
  pkvEigenanteil: Posten;
  abzuege: Posten;
  netto: Posten;
  /** Arbeitgeberanteile zur Sozialversicherung. */
  agAnteil: Posten;
  /** Bruttoentgelt plus Arbeitgeberanteile. */
  arbeitgeberkosten: Posten;
  /** Abzüge geteilt durch Brutto. */
  abgabenquote: number;
  /** Kirchensteuersatz des gewählten Bundeslands, 0 wenn nicht kirchensteuerpflichtig. */
  kirchensteuersatz: number;
  hinweise: Hinweis[];
}

export interface Hinweis {
  art: 'info' | 'warnung';
  text: string;
}

const EURO_PRO_JAHR = 12;

function posten(monat: number): Posten {
  return { monat: cent(monat), jahr: cent(monat * EURO_PRO_JAHR) };
}

/** Euro in Cent als ganze Zahl — die Eingabeeinheit des amtlichen PAP. */
function toCent(euro: number): number {
  return Math.round(euro * 100);
}

export function defaultPayrollInput(): PayrollInput {
  return {
    bruttoMonat: 4000,
    steuerklasse: 1,
    bundesland: 'NW',
    kirchensteuer: false,
    kinderfreibetraege: 0,
    kvTyp: 'gesetzlich',
    zusatzbeitrag: SV.kvZusatzbeitragDurchschnitt,
    pkvKrankenMonat: 650,
    pkvPflegeMonat: 90,
    rvPflicht: true,
    avPflicht: true,
    kinderlos: true,
    pvAbschlaege: 0,
    freibetragJahr: 0,
    hinzurechnungJahr: 0,
    faktor: null,
    geburtsjahr: null,
    minijobRvBefreiung: true,
  };
}

/**
 * Ruft den amtlichen Rechenkern für einen Monat auf und liefert
 * Lohnsteuer, Solidaritätszuschlag und die Bemessungsgrundlage der
 * Kirchenlohnsteuer — jeweils in Cent.
 */
function amtlicheLohnsteuer(input: PayrollInput, sv: SvResult): {
  lohnsteuerCent: number;
  soliCent: number;
  kirchenBasisCent: number;
} {
  const kinderlosZuschlag = input.kinderlos;
  const privat = input.kvTyp === 'privat';

  const rechner = new Lohnsteuer2026({});

  rechner.setLzz(2); // 2 = Monat
  rechner.setRe4(BigDecimal.valueOf(toCent(input.bruttoMonat)));
  rechner.setStkl(input.steuerklasse);

  // Kinderfreibeträge gibt es nur in den Steuerklassen I bis IV.
  const zkf = input.steuerklasse <= 4 ? input.kinderfreibetraege : 0;
  rechner.setZkf(BigDecimal.valueOf(zkf));

  rechner.setR(input.kirchensteuer ? 1 : 0);

  // Krankenversicherung
  rechner.setPkv(privat ? 1 : 0);
  rechner.setKvz(BigDecimal.valueOf(privat ? 0 : input.zusatzbeitrag));
  rechner.setPkpv(BigDecimal.valueOf(privat ? toCent(input.pkvKrankenMonat + input.pkvPflegeMonat) : 0));
  rechner.setPkpvagz(BigDecimal.valueOf(privat ? toCent(sv.pkvZuschuss) : 0));

  // Pflegeversicherung
  rechner.setPvs(BUNDESLAND_MAP[input.bundesland].pflegeSonderregel ? 1 : 0);
  rechner.setPvz(kinderlosZuschlag ? 1 : 0);
  rechner.setPva(BigDecimal.valueOf(kinderlosZuschlag ? 0 : input.pvAbschlaege));

  // Merker für die Vorsorgepauschale: 0 = pflichtversichert, 1 = nicht.
  rechner.setKrv(input.rvPflicht ? 0 : 1);
  rechner.setAlv(input.avPflicht ? 0 : 1);

  // Freibetrag / Hinzurechnungsbetrag aus den Lohnsteuerabzugsmerkmalen.
  rechner.setLzzfreib(BigDecimal.valueOf(toCent(input.freibetragJahr / EURO_PRO_JAHR)));
  rechner.setLzzhinzu(BigDecimal.valueOf(toCent(input.hinzurechnungJahr / EURO_PRO_JAHR)));

  // Altersentlastungsbetrag (§ 24a EStG): nur wenn das 64. Lebensjahr vor
  // Beginn des Kalenderjahres vollendet wurde.
  const altersentlastung = input.geburtsjahr !== null && input.geburtsjahr + 64 < JAHR;
  rechner.setAlter1(altersentlastung ? 1 : 0);
  rechner.setAjahr(altersentlastung ? input.geburtsjahr! + 65 : 0);

  // Steuerklasse IV mit Faktor.
  const faktorAktiv = input.steuerklasse === 4 && input.faktor !== null && input.faktor > 0;
  rechner.setAf(faktorAktiv ? 1 : 0);
  rechner.setF(faktorAktiv ? input.faktor! : 1);

  rechner.MAIN();

  return {
    lohnsteuerCent: rechner.getLstlzz().longValue(),
    soliCent: rechner.getSolzlzz().longValue(),
    kirchenBasisCent: rechner.getBk().longValue(),
  };
}

export function berechneGehalt(input: PayrollInput): PayrollResult {
  const brutto = Math.max(0, input.bruttoMonat);
  const land = BUNDESLAND_MAP[input.bundesland];
  const minijob = brutto > 0 && brutto <= SV.minijobGrenze;

  const sv = berechneSozialversicherung({
    bruttoMonat: brutto,
    bundesland: input.bundesland,
    kvTyp: input.kvTyp,
    zusatzbeitrag: input.zusatzbeitrag,
    pkvKrankenMonat: input.pkvKrankenMonat,
    pkvPflegeMonat: input.pkvPflegeMonat,
    rvPflicht: input.rvPflicht,
    avPflicht: input.avPflicht,
    kinderlos: input.kinderlos,
    pvAbschlaege: input.pvAbschlaege,
    minijobRvBefreiung: input.minijobRvBefreiung,
  });

  // Im Minijob übernimmt der Arbeitgeber die Steuer pauschal mit 2 %
  // (§ 40a Abs. 2 EStG); für den Arbeitnehmer fällt dann keine Lohnsteuer an.
  const steuer = minijob
    ? { lohnsteuerCent: 0, soliCent: 0, kirchenBasisCent: 0 }
    : amtlicheLohnsteuer({ ...input, bruttoMonat: brutto }, sv);

  const kirchensteuersatz = input.kirchensteuer ? land.kirchensteuersatz : 0;
  const lohnsteuerMonat = steuer.lohnsteuerCent / 100;
  const soliMonat = steuer.soliCent / 100;
  const kirchensteuerMonat = cent((steuer.kirchenBasisCent / 100) * kirchensteuersatz);

  const steuernMonat = cent(lohnsteuerMonat + soliMonat + kirchensteuerMonat);
  const abzuegeMonat = cent(steuernMonat + sv.an.summe + sv.pkvEigenanteil);
  const nettoMonat = cent(brutto - abzuegeMonat);

  return {
    eingabe: input,
    brutto: posten(brutto),
    lohnsteuer: posten(lohnsteuerMonat),
    soli: posten(soliMonat),
    kirchensteuer: posten(kirchensteuerMonat),
    steuern: posten(steuernMonat),
    sv,
    svAn: posten(sv.an.summe),
    pkvEigenanteil: posten(sv.pkvEigenanteil),
    abzuege: posten(abzuegeMonat),
    netto: posten(nettoMonat),
    agAnteil: posten(sv.ag.summe),
    arbeitgeberkosten: posten(brutto + sv.ag.summe),
    abgabenquote: brutto > 0 ? abzuegeMonat / brutto : 0,
    kirchensteuersatz,
    hinweise: sammleHinweise(input, brutto, sv),
  };
}

function sammleHinweise(input: PayrollInput, brutto: number, sv: SvResult): Hinweis[] {
  const hinweise: Hinweis[] = [];

  if (sv.modus === 'minijob') {
    hinweise.push({
      art: 'info',
      text: `Bis ${SV.minijobGrenze} € im Monat liegt ein Minijob vor. Hier ist unterstellt, dass der Arbeitgeber die Steuer pauschal mit 2 % übernimmt — dann bleibt das Brutto steuerfrei. Alternativ kann nach Steuerklasse abgerechnet werden.`,
    });
  }

  if (sv.modus === 'uebergangsbereich') {
    hinweise.push({
      art: 'info',
      text: `Zwischen ${SV.minijobGrenze} € und ${SV.uebergangsbereichObergrenze} € gilt der Übergangsbereich („Midijob“): Der Arbeitnehmeranteil zur Sozialversicherung steigt gleitend von null auf den vollen Beitrag, der Arbeitgeber trägt den Rest.`,
    });
  }

  if (sv.bbgErreicht.kvPv) {
    hinweise.push({
      art: 'info',
      text: `Das Brutto liegt über der Beitragsbemessungsgrenze für Kranken- und Pflegeversicherung (${(SV.bbgKvPvJahr / 12).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € im Monat). Jeder Euro darüber ist dort beitragsfrei.`,
    });
  }

  if (sv.bbgErreicht.rvAv) {
    hinweise.push({
      art: 'info',
      text: `Das Brutto liegt über der Beitragsbemessungsgrenze für Renten- und Arbeitslosenversicherung (${(SV.bbgRvAvJahr / 12).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € im Monat).`,
    });
  }

  if (input.kvTyp === 'gesetzlich' && brutto * 12 > SV.jaegJahr) {
    hinweise.push({
      art: 'info',
      text: `Ab einem Jahresbrutto von ${SV.jaegJahr.toLocaleString('de-DE')} € endet die Versicherungspflicht in der gesetzlichen Krankenversicherung — eine private Krankenversicherung wäre möglich.`,
    });
  }

  if (input.steuerklasse === 5 || input.steuerklasse === 6) {
    hinweise.push({
      art: 'info',
      text: 'In den Steuerklassen V und VI ist der Lohnsteuerabzug besonders hoch. Das ist eine Vorauszahlung — zu viel gezahlte Steuer kommt über die Steuererklärung zurück.',
    });
  }

  if (input.kvTyp === 'privat' && input.pkvKrankenMonat <= 0) {
    hinweise.push({
      art: 'warnung',
      text: 'Für die private Krankenversicherung ist noch kein Monatsbeitrag eingetragen — ohne ihn fehlt ein wesentlicher Abzug.',
    });
  }

  return hinweise;
}
