/**
 * Rentenlücke: Was von der gesetzlichen Rente netto übrig bleibt.
 *
 * Zwei Dinge fehlen in den meisten Überschlagsrechnungen, und beide kosten
 * spürbar: Die Rente wird nachgelagert besteuert — wie hoch, hängt vom Jahr
 * des Rentenbeginns ab und bleibt dann lebenslang gleich —, und Rentner zahlen
 * weiterhin Kranken- und Pflegeversicherung. Die Pflegeversicherung tragen sie
 * sogar allein.
 */

import {
  RENTE, RENTENBEZUG, SV, regelaltersgrenze,
  type BundeslandCode,
} from './constants';
import { einkommensteuer, solidaritaetszuschlag } from './tarif';
import { BUNDESLAND_MAP } from './constants';
import { cent } from './sozialversicherung';

export interface RenteEingabe {
  geburtsjahr: number;
  /** Heutiges Bruttoentgelt pro Jahr — bestimmt die künftigen Entgeltpunkte. */
  bruttoJahr: number;
  /** Bereits erworbene Entgeltpunkte laut Renteninformation. */
  entgeltpunkteBisher: number;
  /** Erwartete jährliche Rentenanpassung in Prozent. */
  rentenanpassung: number;
  /** Erwartete Inflation in Prozent — für die Kaufkraft des Wunschbetrags. */
  inflation: number;
  /** Gewünschtes Nettoeinkommen im Ruhestand, in heutiger Kaufkraft. */
  wunschNettoHeute: number;
  kinderlos: boolean;
  /** Kassenindividueller Zusatzbeitrag in Prozent. */
  zusatzbeitrag: number;
}

export interface SteuerlicheLage {
  kirchensteuer: boolean;
  bundesland: BundeslandCode;
}

export interface RenteErgebnis {
  /** Regelaltersgrenze in Jahren, gegebenenfalls mit Monaten. */
  altersgrenze: number;
  rentenbeginnJahr: number;
  jahreBisRente: number;
  entgeltpunkteProJahr: number;
  entgeltpunkteGesamt: number;
  /** Rentenwert zum Rentenbeginn, fortgeschrieben mit der Anpassung. */
  rentenwertBeiBeginn: number;
  bruttoRenteMonat: number;
  /** Steuerpflichtiger Anteil der Rente nach dem Jahr des Rentenbeginns. */
  besteuerungsanteil: number;
  rentenfreibetragMonat: number;
  kvMonat: number;
  pvMonat: number;
  einkommensteuerMonat: number;
  soliMonat: number;
  kirchensteuerMonat: number;
  abzuegeMonat: number;
  nettoRenteMonat: number;
  /** Nettorente, umgerechnet in heutige Kaufkraft. */
  nettoRenteHeutigeKaufkraft: number;
  /** Wunschbetrag, hochgerechnet auf das Jahr des Rentenbeginns. */
  wunschNettoBeiRente: number;
  /** Fehlbetrag pro Monat; negativ bedeutet Überdeckung. */
  luecke: number;
  lueckeHeutigeKaufkraft: number;
  /** Anteil des Wunschbetrags, den die gesetzliche Rente abdeckt. */
  deckungsgrad: number;
  hinweise: string[];
}

export function defaultRenteEingabe(): RenteEingabe {
  return {
    geburtsjahr: 1985,
    bruttoJahr: 48_000,
    entgeltpunkteBisher: 15,
    rentenanpassung: 2,
    inflation: 2,
    wunschNettoHeute: 2_200,
    kinderlos: true,
    zusatzbeitrag: SV.kvZusatzbeitragDurchschnitt,
  };
}

/** Steuerpflichtiger Anteil der Rente nach dem Jahr des Rentenbeginns. */
export function besteuerungsanteil(rentenbeginnJahr: number): number {
  if (rentenbeginnJahr >= RENTENBEZUG.vollBesteuertAb) return 1;
  const schritte = rentenbeginnJahr - RENTENBEZUG.besteuerungsanteilBasisjahr;
  const anteil = RENTENBEZUG.besteuerungsanteilBasis + schritte * RENTENBEZUG.besteuerungsanteilSchritt;
  return Math.min(1, Math.max(0.5, Math.round(anteil * 1000) / 1000));
}

/** Entgeltpunkte, die ein Jahresbrutto einbringt. */
export function entgeltpunkteFuer(bruttoJahr: number): number {
  return Math.min(Math.max(0, bruttoJahr), SV.bbgRvAvJahr) / RENTE.durchschnittsentgelt;
}

export function berechneRente(
  eingabe: RenteEingabe, lage: SteuerlicheLage, aktuellesJahr: number,
): RenteErgebnis {
  const altersgrenze = regelaltersgrenze(eingabe.geburtsjahr);
  const rentenbeginnJahr = Math.round(eingabe.geburtsjahr + altersgrenze);
  const jahreBisRente = Math.max(0, rentenbeginnJahr - aktuellesJahr);

  const proJahr = entgeltpunkteFuer(eingabe.bruttoJahr);
  const gesamt = Math.max(0, eingabe.entgeltpunkteBisher) + proJahr * jahreBisRente;

  const rentenwert = RENTE.rentenwert * (1 + eingabe.rentenanpassung / 100) ** jahreBisRente;
  const bruttoMonat = cent(gesamt * rentenwert);
  const bruttoJahrRente = cent(bruttoMonat * 12);

  // --- Beiträge: KV hälftig, PV allein und in voller Höhe -------------------
  const kvSatz = RENTENBEZUG.kvSatzRentner + eingabe.zusatzbeitrag / 100 / 2;
  const pvSatz = RENTENBEZUG.pvSatzRentner + (eingabe.kinderlos ? RENTENBEZUG.pvZuschlagKinderlos : 0);
  const kvMonat = cent(bruttoMonat * kvSatz);
  const pvMonat = cent(bruttoMonat * pvSatz);

  // --- Steuer: nachgelagerte Besteuerung nach Kohorte -----------------------
  const anteil = besteuerungsanteil(rentenbeginnJahr);
  const steuerpflichtigerTeil = cent(bruttoJahrRente * anteil);
  const rentenfreibetragJahr = cent(bruttoJahrRente - steuerpflichtigerTeil);

  // Die Beiträge zur Kranken- und Pflegeversicherung sind als
  // Sonderausgaben abziehbar — das senkt die Steuer spürbar.
  const vorsorge = cent((kvMonat + pvMonat) * 12);
  const zvE = Math.max(
    0,
    steuerpflichtigerTeil
      - RENTENBEZUG.werbungskostenPauschbetrag
      - RENTENBEZUG.sonderausgabenPauschbetrag
      - vorsorge,
  );

  const steuerJahr = einkommensteuer(zvE);
  const soliJahr = solidaritaetszuschlag(steuerJahr);
  const kirchensatz = lage.kirchensteuer ? BUNDESLAND_MAP[lage.bundesland].kirchensteuersatz : 0;
  const kirchenJahr = cent(steuerJahr * kirchensatz);

  const einkommensteuerMonat = cent(steuerJahr / 12);
  const soliMonat = cent(soliJahr / 12);
  const kirchensteuerMonat = cent(kirchenJahr / 12);

  const abzuege = cent(kvMonat + pvMonat + einkommensteuerMonat + soliMonat + kirchensteuerMonat);
  const netto = cent(bruttoMonat - abzuege);

  const kaufkraftfaktor = (1 + eingabe.inflation / 100) ** jahreBisRente;
  const wunschBeiRente = cent(eingabe.wunschNettoHeute * kaufkraftfaktor);
  const luecke = cent(wunschBeiRente - netto);

  return {
    altersgrenze,
    rentenbeginnJahr,
    jahreBisRente,
    entgeltpunkteProJahr: proJahr,
    entgeltpunkteGesamt: gesamt,
    rentenwertBeiBeginn: Math.round(rentenwert * 100) / 100,
    bruttoRenteMonat: bruttoMonat,
    besteuerungsanteil: anteil,
    rentenfreibetragMonat: cent(rentenfreibetragJahr / 12),
    kvMonat,
    pvMonat,
    einkommensteuerMonat,
    soliMonat,
    kirchensteuerMonat,
    abzuegeMonat: abzuege,
    nettoRenteMonat: netto,
    nettoRenteHeutigeKaufkraft: cent(netto / kaufkraftfaktor),
    wunschNettoBeiRente: wunschBeiRente,
    luecke,
    lueckeHeutigeKaufkraft: cent(luecke / kaufkraftfaktor),
    deckungsgrad: wunschBeiRente > 0 ? netto / wunschBeiRente : 0,
    hinweise: sammleHinweise(eingabe, {
      anteil, bruttoMonat, netto, luecke, abzuege, jahreBisRente, proJahr,
    }),
  };
}

function sammleHinweise(
  eingabe: RenteEingabe,
  w: {
    anteil: number; bruttoMonat: number; netto: number; luecke: number;
    abzuege: number; jahreBisRente: number; proJahr: number;
  },
): string[] {
  const hinweise: string[] = [];

  if (w.bruttoMonat > 0) {
    hinweise.push(
      `Von ${Math.round(w.bruttoMonat)} € Bruttorente bleiben ${Math.round(w.netto)} € netto — ${Math.round((w.abzuege / w.bruttoMonat) * 100)} % gehen für Steuern und Beiträge ab. Wer seine Rentenlücke auf Bruttobasis plant, plant zu knapp.`,
    );
  }

  hinweise.push(
    `Bei Rentenbeginn sind ${Math.round(w.anteil * 100)} % der Rente steuerpflichtig. Dieser Anteil richtet sich nach dem Jahr des Rentenbeginns und bleibt danach lebenslang unverändert — spätere Rentenerhöhungen sind in voller Höhe zu versteuern.`,
  );

  if (eingabe.kinderlos) {
    hinweise.push(
      'Die Pflegeversicherung tragen Rentner allein, nicht hälftig. Als kinderlose Person kommt der Zuschlag von 0,6 Punkten hinzu.',
    );
  }

  if (w.proJahr > 0 && w.jahreBisRente > 0) {
    hinweise.push(
      `Mit dem heutigen Einkommen erwerben Sie ${w.proJahr.toLocaleString('de-DE', { maximumFractionDigits: 2 })} Entgeltpunkte pro Jahr. Unterstellt ist, dass das bis zum Rentenbeginn so bleibt — Teilzeit, Elternzeit oder Gehaltssprünge ändern das Ergebnis erheblich.`,
    );
  }

  if (eingabe.bruttoJahr > SV.bbgRvAvJahr) {
    hinweise.push(
      `Ihr Einkommen liegt über der Beitragsbemessungsgrenze von ${SV.bbgRvAvJahr.toLocaleString('de-DE')} €. Darüber hinaus entstehen keine weiteren Entgeltpunkte — die gesetzliche Rente wächst also nicht mit jedem Gehaltssprung mit.`,
    );
  }

  if (w.luecke <= 0) {
    hinweise.push('Die gesetzliche Rente deckt Ihren Wunschbetrag rechnerisch ab — eine Lücke besteht nach diesen Annahmen nicht.');
  }

  return hinweise;
}

/**
 * Grob benötigtes Kapital, um eine monatliche Lücke über n Jahre zu schließen.
 *
 * Gerechnet wird als Rentenbarwert mit realer Rendite, also ohne Steuern auf
 * die Entnahme. Für die genaue Rechnung samt Besteuerung dient der
 * Entnahmeplan — dieser Wert ist nur eine Hausnummer.
 */
export function kapitalFuerLuecke(
  lueckeMonat: number, jahre: number, renditeProzent: number, inflationProzent: number,
): number {
  if (lueckeMonat <= 0 || jahre <= 0) return 0;
  const real = (1 + renditeProzent / 100) / (1 + inflationProzent / 100) - 1;
  const n = jahre;
  const jahresbetrag = lueckeMonat * 12;
  if (Math.abs(real) < 1e-9) return cent(jahresbetrag * n);
  return cent((jahresbetrag * (1 - (1 + real) ** -n)) / real);
}
