/**
 * Rechengrößen 2026.
 *
 * Steuerliche Werte stammen aus dem amtlichen Programmablaufplan
 * (vendor/Lohnsteuer2026.xml) und sind dort fest verdrahtet — sie stehen hier
 * nur zur Anzeige. Die Sozialversicherungswerte werden hier gepflegt.
 *
 * Quellen:
 *  - Sozialversicherungs-Rechengrößenverordnung 2026 (BBG, JAEG)
 *  - § 32a EStG (Tarif 2026), § 39b EStG, SolzG
 *  - § 20 Abs. 2a SGB IV (Übergangsbereich), § 8 SGB IV (Geringfügigkeitsgrenze)
 */

export const JAHR = 2026 as const;

/** Stand des amtlichen Programmablaufplans, der dem Rechenkern zugrunde liegt. */
export const PAP_STAND = '23.10.2025';

export const SV = {
  /** Beitragsbemessungsgrenze Renten- und Arbeitslosenversicherung, € / Jahr. */
  bbgRvAvJahr: 101_400,
  /** Beitragsbemessungsgrenze Kranken- und Pflegeversicherung, € / Jahr. */
  bbgKvPvJahr: 69_750,
  /** Jahresarbeitsentgeltgrenze (Versicherungspflichtgrenze GKV), € / Jahr. */
  jaegJahr: 77_400,

  /** Allgemeiner Beitragssatz gesetzliche Krankenversicherung, gesamt. */
  kvAllgemein: 0.146,
  /** Durchschnittlicher Zusatzbeitragssatz 2026 (kassenindividuell), gesamt. */
  kvZusatzbeitragDurchschnitt: 2.9,
  /** Beitragssatz Pflegeversicherung, gesamt. */
  pvGesamt: 0.036,
  /** Beitragssatz Rentenversicherung, gesamt. */
  rvGesamt: 0.186,
  /** Beitragssatz Arbeitslosenversicherung, gesamt. */
  avGesamt: 0.026,

  /** Zuschlag für Kinderlose ab 23 Jahren — trägt der Arbeitnehmer allein. */
  pvZuschlagKinderlos: 0.006,
  /** Abschlag je Kind ab dem 2. Kind unter 25, max. 4 Abschläge. */
  pvAbschlagProKind: 0.0025,
  /** Arbeitnehmeranteil Pflegeversicherung in Sachsen (statt 1,8 %). */
  pvAnteilAnSachsen: 0.023,
  /** Arbeitnehmeranteil Pflegeversicherung außerhalb Sachsens. */
  pvAnteilAnRegulaer: 0.018,

  /** Geringfügigkeitsgrenze (Minijob), € / Monat. */
  minijobGrenze: 603,
  /** Obergrenze des Übergangsbereichs (Midijob), € / Monat. */
  uebergangsbereichObergrenze: 2_000,
  /** Faktor F für den Übergangsbereich 2026 (= 28 % / Gesamtbeitragssatz). */
  faktorF: 0.6619,
  /** Pauschalbeitrag des Arbeitgebers bei Minijobs (RV 15 % + KV 13 %). */
  minijobPauschaleAg: 0.28,
  /** Davon entfallen auf die Rentenversicherung — maßgeblich für Entgeltpunkte. */
  minijobPauschaleRv: 0.15,
  /** Pauschsteuer bei Minijobs, trägt üblicherweise der Arbeitgeber. */
  minijobPauschsteuer: 0.02,
  /** Eigenanteil des Arbeitnehmers zur RV im Minijob ohne Befreiungsantrag. */
  minijobRvEigenanteil: 0.036,
} as const;

/** Steuerliche Werte 2026 — nur zur Erläuterung in der Oberfläche. */
export const STEUER = {
  grundfreibetrag: 12_348,
  arbeitnehmerPauschbetrag: 1_230,
  sonderausgabenPauschbetrag: 36,
  kinderfreibetragVoll: 9_756,
  entlastungsbetragAlleinerziehende: 4_260,
  entlastungsbetragJeWeiteresKind: 240,
  soliFreigrenze: 20_350,
  soliSatz: 0.055,
  spitzensteuersatzAb: 69_879,
  reichensteuerAb: 277_826,
} as const;

export type BundeslandCode =
  | 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV'
  | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH';

export interface Bundesland {
  code: BundeslandCode;
  name: string;
  /** Kirchensteuersatz als Anteil der Lohnsteuer (8 % bzw. 9 %). */
  kirchensteuersatz: number;
  /** In Sachsen trägt der Arbeitnehmer 0,5 Punkte mehr zur Pflegeversicherung. */
  pflegeSonderregel: boolean;
}

/**
 * Die Beitragsbemessungsgrenzen sind seit 2025 bundesweit einheitlich.
 * Das Bundesland wirkt sich nur noch auf den Kirchensteuersatz und — in
 * Sachsen — auf die Aufteilung des Pflegeversicherungsbeitrags aus.
 */
export const BUNDESLAENDER: readonly Bundesland[] = [
  { code: 'BW', name: 'Baden-Württemberg', kirchensteuersatz: 0.08, pflegeSonderregel: false },
  { code: 'BY', name: 'Bayern', kirchensteuersatz: 0.08, pflegeSonderregel: false },
  { code: 'BE', name: 'Berlin', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'BB', name: 'Brandenburg', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'HB', name: 'Bremen', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'HH', name: 'Hamburg', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'HE', name: 'Hessen', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'MV', name: 'Mecklenburg-Vorpommern', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'NI', name: 'Niedersachsen', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'NW', name: 'Nordrhein-Westfalen', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'RP', name: 'Rheinland-Pfalz', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'SL', name: 'Saarland', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'SN', name: 'Sachsen', kirchensteuersatz: 0.09, pflegeSonderregel: true },
  { code: 'ST', name: 'Sachsen-Anhalt', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'SH', name: 'Schleswig-Holstein', kirchensteuersatz: 0.09, pflegeSonderregel: false },
  { code: 'TH', name: 'Thüringen', kirchensteuersatz: 0.09, pflegeSonderregel: false },
];

export const BUNDESLAND_MAP: Record<BundeslandCode, Bundesland> = Object.fromEntries(
  BUNDESLAENDER.map((b) => [b.code, b]),
) as Record<BundeslandCode, Bundesland>;

export const STEUERKLASSEN = [
  { wert: 1, label: 'I', beschreibung: 'Ledig, verwitwet oder getrennt lebend' },
  { wert: 2, label: 'II', beschreibung: 'Alleinerziehend — mit Entlastungsbetrag' },
  { wert: 3, label: 'III', beschreibung: 'Verheiratet, Partner in Klasse V oder ohne Lohn' },
  { wert: 4, label: 'IV', beschreibung: 'Verheiratet, beide verdienen ähnlich viel' },
  { wert: 5, label: 'V', beschreibung: 'Verheiratet, Partner in Klasse III' },
  { wert: 6, label: 'VI', beschreibung: 'Zweites und weiteres Dienstverhältnis' },
] as const;

export type Steuerklasse = 1 | 2 | 3 | 4 | 5 | 6;

/** Werte der gesetzlichen Rentenversicherung für die Teilzeit-Prognose. */
export const RENTE = {
  /** Vorläufiges Durchschnittsentgelt 2026, € / Jahr — ergibt genau 1 Entgeltpunkt. */
  durchschnittsentgelt: 51_944,
  /** Aktueller Rentenwert ab 1. Juli 2026: monatliche Bruttorente je Entgeltpunkt. */
  rentenwert: 42.52,
} as const;

/** Durchschnittliche Wochen pro Monat (52 / 12) für Stundenlohn-Angaben. */
export const WOCHEN_PRO_MONAT = 52 / 12;

/** Besteuerung privater Kapitalerträge (Abgeltungsteuer). */
export const KAPITAL = {
  /** Sparer-Pauschbetrag je Person, € / Jahr (§ 20 Abs. 9 EStG). */
  sparerPauschbetrag: 1_000,
  /** Bei Zusammenveranlagung verdoppelt er sich. */
  sparerPauschbetragZusammen: 2_000,
  /** Abgeltungsteuersatz (§ 32d Abs. 1 Satz 1 EStG). */
  abgeltungsteuer: 0.25,
  /** Solidaritätszuschlag auf die Kapitalertragsteuer — ohne Freigrenze. */
  soliSatz: 0.055,
  /**
   * Üblicher Anrechnungshöchstsatz für ausländische Quellensteuer nach den
   * meisten Doppelbesteuerungsabkommen.
   */
  quellensteuerAnrechnungStandard: 15,
} as const;

export type Anlageart =
  | 'aktien' | 'aktienfonds' | 'mischfonds' | 'immobilienfonds' | 'immobilienfondsAusland' | 'sonstigeFonds';

/** Teilfreistellung für Privatanleger nach § 20 InvStG. */
export const ANLAGEARTEN: readonly {
  wert: Anlageart; name: string; teilfreistellung: number; hinweis: string;
}[] = [
  { wert: 'aktien', name: 'Einzelaktien', teilfreistellung: 0,
    hinweis: 'Direkt gehaltene Aktien — keine Teilfreistellung.' },
  { wert: 'aktienfonds', name: 'Aktienfonds / Aktien-ETF', teilfreistellung: 0.30,
    hinweis: 'Mindestens 51 % Kapitalbeteiligungen — 30 % der Erträge bleiben steuerfrei.' },
  { wert: 'mischfonds', name: 'Mischfonds', teilfreistellung: 0.15,
    hinweis: 'Mindestens 25 % Kapitalbeteiligungen — 15 % steuerfrei.' },
  { wert: 'immobilienfonds', name: 'Immobilienfonds', teilfreistellung: 0.60,
    hinweis: 'Mindestens 51 % Immobilien — 60 % steuerfrei.' },
  { wert: 'immobilienfondsAusland', name: 'Immobilienfonds (Ausland)', teilfreistellung: 0.80,
    hinweis: 'Überwiegend ausländische Immobilien — 80 % steuerfrei.' },
  { wert: 'sonstigeFonds', name: 'Renten- und sonstige Fonds', teilfreistellung: 0,
    hinweis: 'Ohne nennenswerte Kapitalbeteiligungen — keine Teilfreistellung.' },
];

export const ANLAGEART_MAP = Object.fromEntries(
  ANLAGEARTEN.map((a) => [a.wert, a]),
) as Record<Anlageart, (typeof ANLAGEARTEN)[number]>;
