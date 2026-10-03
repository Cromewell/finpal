/**
 * Typen für den generierten amtlichen Rechenkern (lohnsteuer2026.generated.js).
 *
 * Die Namen folgen exakt den Ein- und Ausgabeparametern des amtlichen
 * Programmablaufplans. Geldbeträge sind durchweg CENT-Werte.
 */

import type { BigDecimal } from './bigdecimal';

declare class Lohnsteuer2026 {
  /** Der generierte Rechenkern erwartet immer ein Objekt — `{}` für Vorgabewerte. */
  constructor(params: Record<string, unknown>);

  /** Führt den vollständigen Programmablauf aus. Danach stehen die Ausgaben bereit. */
  MAIN(): void;

  // --- Ganzzahlige Merker ---------------------------------------------------
  /** 1 = Faktorverfahren gewählt (nur Steuerklasse IV). */
  setAf(wert: number): void;
  /** Kalenderjahr nach Vollendung des 64. Lebensjahres (nötig bei ALTER1 = 1). */
  setAjahr(wert: number): void;
  /** 1 = 64. Lebensjahr zu Beginn des Kalenderjahres vollendet (§ 24a EStG). */
  setAlter1(wert: number): void;
  /** 0 = pflichtversichert in der Arbeitslosenversicherung, sonst 1. */
  setAlv(wert: number): void;
  /** 0 = pflichtversichert in der gesetzlichen Rentenversicherung, sonst 1. */
  setKrv(wert: number): void;
  /** Lohnzahlungszeitraum: 1 = Jahr, 2 = Monat, 3 = Woche, 4 = Tag. */
  setLzz(wert: number): void;
  /** 0 = gesetzlich krankenversichert, 1 = ausschließlich privat. */
  setPkv(wert: number): void;
  /** 1 = Besonderheiten Sachsens in der Pflegeversicherung. */
  setPvs(wert: number): void;
  /** 1 = Arbeitnehmer zahlt den Zuschlag für Kinderlose. */
  setPvz(wert: number): void;
  /** Religionsgemeinschaft; 0 = keine. */
  setR(wert: number): void;
  /** Steuerklasse 1 bis 6. */
  setStkl(wert: number): void;
  /** Jahr des erstmaligen Versorgungsbezugs. */
  setVjahr(wert: number): void;
  /** Zahl der Monate mit Versorgungsbezügen (nur bei Jahresberechnung). */
  setZmvb(wert: number): void;

  /** Eingetragener Faktor mit drei Nachkommastellen. */
  setF(wert: number): void;

  // --- Beträge und Sätze ----------------------------------------------------
  /** Jahresfreibetrag für sonstige Bezüge, in Cent. */
  setJfreib(wert: BigDecimal): void;
  /** Jahreshinzurechnungsbetrag für sonstige Bezüge, in Cent. */
  setJhinzu(wert: BigDecimal): void;
  /** Voraussichtlicher Jahresarbeitslohn ohne sonstige Bezüge, in Cent. */
  setJre4(wert: BigDecimal): void;
  /** In JRE4 enthaltene Entschädigungen, in Cent. */
  setJre4ent(wert: BigDecimal): void;
  /** In JRE4 enthaltene Versorgungsbezüge, in Cent. */
  setJvbez(wert: BigDecimal): void;
  /** Kassenindividueller Zusatzbeitragssatz in Prozent, voller Satz. */
  setKvz(wert: BigDecimal): void;
  /** Freibetrag für den Lohnzahlungszeitraum, in Cent. */
  setLzzfreib(wert: BigDecimal): void;
  /** Hinzurechnungsbetrag für den Lohnzahlungszeitraum, in Cent. */
  setLzzhinzu(wert: BigDecimal): void;
  /** Nicht zu besteuernde Vorteile bei Vermögensbeteiligungen, in Cent. */
  setMbv(wert: BigDecimal): void;
  /** Monatsbeitrag private Basiskranken- und Pflege-Pflichtversicherung, in Cent. */
  setPkpv(wert: BigDecimal): void;
  /** Monatlicher Arbeitgeberzuschuss zur privaten Versicherung, in Cent. */
  setPkpvagz(wert: BigDecimal): void;
  /** Zahl der Beitragsabschläge in der Pflegeversicherung, 0 bis 4. */
  setPva(wert: BigDecimal): void;
  /** Steuerpflichtiger Arbeitslohn des Lohnzahlungszeitraums, in Cent. */
  setRe4(wert: BigDecimal): void;
  /** Sonstige Bezüge, in Cent. */
  setSonstb(wert: BigDecimal): void;
  /** In SONSTB enthaltene Entschädigungen, in Cent. */
  setSonstent(wert: BigDecimal): void;
  /** Sterbegeld und Kapitalauszahlungen, in Cent. */
  setSterbe(wert: BigDecimal): void;
  /** In RE4 enthaltene Versorgungsbezüge, in Cent. */
  setVbez(wert: BigDecimal): void;
  /** Versorgungsbezug im Januar 2005 bzw. im ersten vollen Monat, in Cent. */
  setVbezm(wert: BigDecimal): void;
  /** Voraussichtliche Sonderzahlungen von Versorgungsbezügen, in Cent. */
  setVbezs(wert: BigDecimal): void;
  /** In SONSTB enthaltene Versorgungsbezüge, in Cent. */
  setVbs(wert: BigDecimal): void;
  /** Zahl der Kinderfreibeträge, eine Dezimalstelle. */
  setZkf(wert: BigDecimal): void;

  // --- Ausgaben -------------------------------------------------------------
  /** Bemessungsgrundlage der Kirchenlohnsteuer, in Cent. */
  getBk(): BigDecimal;
  /** Bemessungsgrundlage der Kirchenlohnsteuer für sonstige Bezüge, in Cent. */
  getBks(): BigDecimal;
  /** Lohnsteuer für den Lohnzahlungszeitraum, in Cent. */
  getLstlzz(): BigDecimal;
  /** Solidaritätszuschlag für den Lohnzahlungszeitraum, in Cent. */
  getSolzlzz(): BigDecimal;
  /** Solidaritätszuschlag auf sonstige Bezüge, in Cent. */
  getSolzs(): BigDecimal;
  /** Lohnsteuer auf sonstige Bezüge, in Cent. */
  getSts(): BigDecimal;
  /** Versorgungsfreibetrag, in Cent. */
  getVfrb(): BigDecimal;
  getVfrbs1(): BigDecimal;
  getVfrbs2(): BigDecimal;
  /** Für die Vorsorgepauschale berücksichtigter Arbeitslohn, in Cent. */
  getWvfrb(): BigDecimal;
  getWvfrbm(): BigDecimal;
  getWvfrbo(): BigDecimal;
}

export default Lohnsteuer2026;
