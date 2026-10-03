/**
 * Beiträge zur Sozialversicherung (Arbeitnehmer- und Arbeitgeberanteil).
 *
 * Abgedeckt sind der Regelfall, der Übergangsbereich („Midijob“,
 * § 20 Abs. 2a SGB IV) und der Minijob (§ 8 SGB IV) sowie private
 * Kranken- und Pflegeversicherung mit Arbeitgeberzuschuss (§ 257 SGB V,
 * § 61 SGB XI).
 */

import { BUNDESLAND_MAP, SV, type BundeslandCode } from './constants';

export type SvModus = 'minijob' | 'uebergangsbereich' | 'regulaer';
export type KvTyp = 'gesetzlich' | 'privat';

export interface SvInput {
  /** Monatliches Bruttoentgelt in Euro. */
  bruttoMonat: number;
  bundesland: BundeslandCode;
  kvTyp: KvTyp;
  /** Kassenindividueller Zusatzbeitragssatz in Prozent, voller Satz. */
  zusatzbeitrag: number;
  /** Monatsbeitrag private Krankenversicherung (Basisabsicherung) in Euro. */
  pkvKrankenMonat: number;
  /** Monatsbeitrag private Pflege-Pflichtversicherung in Euro. */
  pkvPflegeMonat: number;
  /** Pflichtversichert in der gesetzlichen Rentenversicherung. */
  rvPflicht: boolean;
  /** Pflichtversichert in der Arbeitslosenversicherung. */
  avPflicht: boolean;
  /** Kinderlos und mindestens 23 Jahre alt — Zuschlag zur Pflegeversicherung. */
  kinderlos: boolean;
  /** Zahl der Beitragsabschläge (Kinder unter 25 ab dem zweiten), 0–4. */
  pvAbschlaege: 0 | 1 | 2 | 3 | 4;
  /** Im Minijob: Befreiung von der Rentenversicherungspflicht beantragt. */
  minijobRvBefreiung: boolean;
}

export interface SvBeitraege {
  kv: number;
  pv: number;
  rv: number;
  av: number;
  summe: number;
}

export interface SvResult {
  modus: SvModus;
  /** Arbeitnehmeranteile in Euro pro Monat. */
  an: SvBeitraege;
  /** Arbeitgeberanteile in Euro pro Monat. */
  ag: SvBeitraege;
  /** Arbeitgeberzuschuss zur privaten Kranken-/Pflegeversicherung, Euro/Monat. */
  pkvZuschuss: number;
  /** Tatsächlich vom Arbeitnehmer zu zahlende private Prämie nach Zuschuss. */
  pkvEigenanteil: number;
  bemessung: {
    /** Beitragspflichtiges Entgelt für KV/PV (nach Beitragsbemessungsgrenze). */
    kvPv: number;
    /** Beitragspflichtiges Entgelt für RV/AV (nach Beitragsbemessungsgrenze). */
    rvAv: number;
    /** Im Übergangsbereich: reduzierte Bemessungsgrundlage des Arbeitnehmers. */
    anFiktiv: number | null;
    /** Im Übergangsbereich: Bemessungsgrundlage des Gesamtbeitrags. */
    gesamtFiktiv: number | null;
  };
  /** Angewandte Arbeitnehmer-Beitragssätze (als Anteil, nicht Prozent). */
  saetze: {
    kvAn: number;
    pvAn: number;
    rvAn: number;
    avAn: number;
  };
  /** Greift eine Beitragsbemessungsgrenze? Für Hinweise in der Oberfläche. */
  bbgErreicht: { kvPv: boolean; rvAv: boolean };
}

/** Auf Cent runden (§ 123 Abs. 1 SGB IV: ab 0,5 Cent aufwärts). */
export function cent(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Arbeitnehmeranteil der Pflegeversicherung nach Bundesland und Kindern. */
export function pflegeSatzArbeitnehmer(
  bundesland: BundeslandCode,
  kinderlos: boolean,
  abschlaege: number,
): number {
  const sachsen = BUNDESLAND_MAP[bundesland].pflegeSonderregel;
  let satz = sachsen ? SV.pvAnteilAnSachsen : SV.pvAnteilAnRegulaer;
  if (kinderlos) {
    satz += SV.pvZuschlagKinderlos;
  } else {
    satz -= Math.min(4, Math.max(0, abschlaege)) * SV.pvAbschlagProKind;
  }
  return satz;
}

/** Arbeitgeberanteil der Pflegeversicherung (in Sachsen 1,3 % statt 1,8 %). */
export function pflegeSatzArbeitgeber(bundesland: BundeslandCode): number {
  const sachsen = BUNDESLAND_MAP[bundesland].pflegeSonderregel;
  return sachsen ? SV.pvGesamt - SV.pvAnteilAnSachsen : SV.pvAnteilAnRegulaer;
}

/**
 * Reduzierte Bemessungsgrundlage des Arbeitnehmers im Übergangsbereich.
 * Sie steigt linear von 0 € an der Geringfügigkeitsgrenze auf das volle
 * Entgelt an der Obergrenze — der Arbeitnehmeranteil wächst entsprechend
 * gleitend von null auf den regulären Beitrag.
 */
export function uebergangsbereichAnEntgelt(bruttoMonat: number): number {
  const { minijobGrenze: g, uebergangsbereichObergrenze: og } = SV;
  return (og / (og - g)) * (bruttoMonat - g);
}

/**
 * Bemessungsgrundlage des Gesamtbeitrags im Übergangsbereich
 * (§ 20 Abs. 2a Satz 1 SGB IV). An der Geringfügigkeitsgrenze entspricht der
 * Gesamtbeitrag genau den 28 % Pauschalbeitrag eines Minijobs.
 */
export function uebergangsbereichGesamtEntgelt(bruttoMonat: number): number {
  const { minijobGrenze: g, uebergangsbereichObergrenze: og, faktorF: f } = SV;
  const spanne = og - g;
  return f * g + (og / spanne - (g / spanne) * f) * (bruttoMonat - g);
}

export function berechneSozialversicherung(input: SvInput): SvResult {
  const {
    bruttoMonat, bundesland, kvTyp, zusatzbeitrag,
    pkvKrankenMonat, pkvPflegeMonat, rvPflicht, avPflicht,
    kinderlos, pvAbschlaege, minijobRvBefreiung,
  } = input;

  const bbgKvPvMonat = SV.bbgKvPvJahr / 12;
  const bbgRvAvMonat = SV.bbgRvAvJahr / 12;

  const kvSatzAn = (SV.kvAllgemein + zusatzbeitrag / 100) / 2;
  const kvSatzAg = kvSatzAn;
  const pvSatzAn = pflegeSatzArbeitnehmer(bundesland, kinderlos, pvAbschlaege);
  const pvSatzAg = pflegeSatzArbeitgeber(bundesland);
  const rvSatzAn = SV.rvGesamt / 2;
  const avSatzAn = SV.avGesamt / 2;

  const gesetzlich = kvTyp === 'gesetzlich';
  const saetze = { kvAn: gesetzlich ? kvSatzAn : 0, pvAn: gesetzlich ? pvSatzAn : 0, rvAn: rvSatzAn, avAn: avSatzAn };

  // --- Arbeitgeberzuschuss zur privaten Kranken-/Pflegeversicherung ---------
  let pkvZuschuss = 0;
  let pkvEigenanteil = 0;
  if (!gesetzlich) {
    const zuschussKv = Math.min(pkvKrankenMonat / 2, bbgKvPvMonat * kvSatzAg);
    const zuschussPv = Math.min(pkvPflegeMonat / 2, bbgKvPvMonat * pvSatzAg);
    pkvZuschuss = cent(zuschussKv + zuschussPv);
    pkvEigenanteil = cent(Math.max(0, pkvKrankenMonat + pkvPflegeMonat - pkvZuschuss));
  }

  // --- Minijob --------------------------------------------------------------
  if (bruttoMonat <= SV.minijobGrenze) {
    const rvAn = minijobRvBefreiung ? 0 : cent(bruttoMonat * SV.minijobRvEigenanteil);
    return {
      modus: 'minijob',
      an: { kv: 0, pv: 0, rv: rvAn, av: 0, summe: rvAn },
      ag: {
        kv: cent(bruttoMonat * 0.13),
        pv: 0,
        rv: cent(bruttoMonat * 0.15),
        av: 0,
        summe: cent(bruttoMonat * SV.minijobPauschaleAg),
      },
      pkvZuschuss: gesetzlich ? 0 : pkvZuschuss,
      pkvEigenanteil: gesetzlich ? 0 : pkvEigenanteil,
      bemessung: { kvPv: 0, rvAv: bruttoMonat, anFiktiv: null, gesamtFiktiv: null },
      saetze: { kvAn: 0, pvAn: 0, rvAn: minijobRvBefreiung ? 0 : SV.minijobRvEigenanteil, avAn: 0 },
      bbgErreicht: { kvPv: false, rvAv: false },
    };
  }

  // --- Übergangsbereich (Midijob) ------------------------------------------
  if (bruttoMonat <= SV.uebergangsbereichObergrenze) {
    const anEntgelt = uebergangsbereichAnEntgelt(bruttoMonat);
    const gesamtEntgelt = uebergangsbereichGesamtEntgelt(bruttoMonat);

    const anKv = gesetzlich ? cent(anEntgelt * kvSatzAn) : 0;
    const anPv = gesetzlich ? cent(anEntgelt * pvSatzAn) : 0;
    const anRv = rvPflicht ? cent(anEntgelt * rvSatzAn) : 0;
    const anAv = avPflicht ? cent(anEntgelt * avSatzAn) : 0;

    // Der Arbeitgeber trägt den Rest des Gesamtbeitrags.
    const gesKv = gesetzlich ? cent(gesamtEntgelt * (SV.kvAllgemein + zusatzbeitrag / 100)) : 0;
    const gesPv = gesetzlich ? cent(gesamtEntgelt * SV.pvGesamt) : 0;
    const gesRv = rvPflicht ? cent(gesamtEntgelt * SV.rvGesamt) : 0;
    const gesAv = avPflicht ? cent(gesamtEntgelt * SV.avGesamt) : 0;

    const an = { kv: anKv, pv: anPv, rv: anRv, av: anAv, summe: cent(anKv + anPv + anRv + anAv) };
    const ag = {
      // Bei privater Versicherung trägt der Arbeitgeber statt des Kassenbeitrags
      // seinen Zuschuss zur Prämie.
      kv: gesetzlich ? cent(Math.max(0, gesKv - anKv)) : pkvZuschuss,
      pv: cent(Math.max(0, gesPv - anPv)),
      rv: cent(Math.max(0, gesRv - anRv)),
      av: cent(Math.max(0, gesAv - anAv)),
      summe: 0,
    };
    ag.summe = cent(ag.kv + ag.pv + ag.rv + ag.av);

    return {
      modus: 'uebergangsbereich',
      an,
      ag,
      pkvZuschuss: gesetzlich ? 0 : pkvZuschuss,
      pkvEigenanteil: gesetzlich ? 0 : pkvEigenanteil,
      bemessung: { kvPv: anEntgelt, rvAv: anEntgelt, anFiktiv: anEntgelt, gesamtFiktiv: gesamtEntgelt },
      saetze,
      bbgErreicht: { kvPv: false, rvAv: false },
    };
  }

  // --- Regelfall -----------------------------------------------------------
  const basisKvPv = Math.min(bruttoMonat, bbgKvPvMonat);
  const basisRvAv = Math.min(bruttoMonat, bbgRvAvMonat);

  const anKv = gesetzlich ? cent(basisKvPv * kvSatzAn) : 0;
  const anPv = gesetzlich ? cent(basisKvPv * pvSatzAn) : 0;
  const anRv = rvPflicht ? cent(basisRvAv * rvSatzAn) : 0;
  const anAv = avPflicht ? cent(basisRvAv * avSatzAn) : 0;

  const agKv = gesetzlich ? cent(basisKvPv * kvSatzAg) : pkvZuschuss;
  const agPv = gesetzlich ? cent(basisKvPv * pvSatzAg) : 0;
  const agRv = rvPflicht ? cent(basisRvAv * rvSatzAn) : 0;
  const agAv = avPflicht ? cent(basisRvAv * avSatzAn) : 0;

  return {
    modus: 'regulaer',
    an: { kv: anKv, pv: anPv, rv: anRv, av: anAv, summe: cent(anKv + anPv + anRv + anAv) },
    ag: { kv: agKv, pv: agPv, rv: agRv, av: agAv, summe: cent(agKv + agPv + agRv + agAv) },
    pkvZuschuss,
    pkvEigenanteil,
    bemessung: { kvPv: basisKvPv, rvAv: basisRvAv, anFiktiv: null, gesamtFiktiv: null },
    saetze,
    bbgErreicht: {
      kvPv: gesetzlich && bruttoMonat > bbgKvPvMonat,
      rvAv: (rvPflicht || avPflicht) && bruttoMonat > bbgRvAvMonat,
    },
  };
}
