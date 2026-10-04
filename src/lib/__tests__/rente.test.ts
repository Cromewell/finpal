import { describe, expect, it } from 'vitest';
import {
  berechneRente, besteuerungsanteil, defaultRenteEingabe, entgeltpunkteFuer,
  kapitalFuerLuecke, type RenteEingabe, type SteuerlicheLage,
} from '../rente';
import { regelaltersgrenze, RENTE, SV } from '../constants';
import { einkommensteuer, einkommensteuerSplitting, grenzsteuersatz } from '../tarif';

const ohneKirche: SteuerlicheLage = { kirchensteuer: false, bundesland: 'NW' };
const mitKirche: SteuerlicheLage = { kirchensteuer: true, bundesland: 'NW' };
const JETZT = 2026;

const rente = (teil: Partial<RenteEingabe> = {}): RenteEingabe => ({
  ...defaultRenteEingabe(), ...teil,
});

describe('Einkommensteuertarif 2026', () => {
  it('lässt den Grundfreibetrag steuerfrei', () => {
    expect(einkommensteuer(12_348)).toBe(0);
    expect(einkommensteuer(12_349)).toBe(0); // erster Euro darüber noch gerundet null
    expect(einkommensteuer(13_000)).toBeGreaterThan(0);
  });

  it('ist an den Zonengrenzen stetig', () => {
    // Der Tarif selbst geht stetig ineinander über; sichtbar bleibt nur die
    // gesetzliche Abrundung auf volle Euro, also höchstens ein Euro Sprung.
    for (const grenze of [17_799, 69_878, 277_825]) {
      const links = einkommensteuer(grenze);
      const rechts = einkommensteuer(grenze + 1);
      expect(rechts - links).toBeLessThanOrEqual(1);
      expect(rechts).toBeGreaterThanOrEqual(links);
    }
  });

  it('erreicht den Spitzensteuersatz von 42 % und den Höchstsatz von 45 %', () => {
    expect(grenzsteuersatz(100_000)).toBeCloseTo(0.42, 2);
    expect(grenzsteuersatz(300_000)).toBeCloseTo(0.45, 2);
  });

  it('steigt streng monoton', () => {
    let vorher = -1;
    for (let zvE = 0; zvE <= 400_000; zvE += 1_000) {
      const s = einkommensteuer(zvE);
      expect(s).toBeGreaterThanOrEqual(vorher);
      vorher = s;
    }
  });

  it('entlastet durch das Splittingverfahren', () => {
    expect(einkommensteuerSplitting(100_000)).toBeLessThan(einkommensteuer(100_000));
    // Bei gleich verteiltem Einkommen bringt Splitting nichts.
    expect(einkommensteuerSplitting(60_000)).toBeCloseTo(2 * einkommensteuer(30_000), 0);
  });
});

describe('Regelaltersgrenze', () => {
  it('liegt ab Jahrgang 1964 bei 67', () => {
    expect(regelaltersgrenze(1964)).toBe(67);
    expect(regelaltersgrenze(1990)).toBe(67);
  });

  it('steigt für die Jahrgänge dazwischen schrittweise', () => {
    expect(regelaltersgrenze(1946)).toBe(65);
    expect(regelaltersgrenze(1958)).toBeCloseTo(66, 5);
    expect(regelaltersgrenze(1960)).toBeCloseTo(66 + 4 / 12, 5);
    expect(regelaltersgrenze(1963)).toBeCloseTo(66 + 10 / 12, 5);
  });
});

describe('Besteuerungsanteil nach Kohorte', () => {
  it('beträgt 84 % bei Rentenbeginn 2026', () => {
    expect(besteuerungsanteil(2026)).toBeCloseTo(0.84, 5);
  });

  it('steigt um einen halben Punkt pro Jahr', () => {
    expect(besteuerungsanteil(2023)).toBeCloseTo(0.825, 5);
    expect(besteuerungsanteil(2030)).toBeCloseTo(0.86, 5);
    expect(besteuerungsanteil(2040)).toBeCloseTo(0.91, 5);
  });

  it('erreicht ab 2058 volle Besteuerung', () => {
    expect(besteuerungsanteil(2058)).toBe(1);
    expect(besteuerungsanteil(2070)).toBe(1);
  });
});

describe('Entgeltpunkte', () => {
  it('ergibt beim Durchschnittsentgelt genau einen Punkt', () => {
    expect(entgeltpunkteFuer(RENTE.durchschnittsentgelt)).toBeCloseTo(1, 10);
  });

  it('wird durch die Beitragsbemessungsgrenze gedeckelt', () => {
    expect(entgeltpunkteFuer(500_000))
      .toBeCloseTo(SV.bbgRvAvJahr / RENTE.durchschnittsentgelt, 10);
  });
});

describe('Rentenlücke', () => {
  const r = berechneRente(rente(), ohneKirche, JETZT);

  it('bestimmt Rentenbeginn und verbleibende Jahre', () => {
    expect(r.rentenbeginnJahr).toBe(1985 + 67);
    expect(r.jahreBisRente).toBe(1985 + 67 - JETZT);
  });

  it('schreibt die Entgeltpunkte bis zum Rentenbeginn fort', () => {
    expect(r.entgeltpunkteGesamt)
      .toBeCloseTo(15 + r.entgeltpunkteProJahr * r.jahreBisRente, 6);
  });

  it('zieht Kranken- und Pflegeversicherung von der Rente ab', () => {
    expect(r.kvMonat).toBeGreaterThan(0);
    expect(r.pvMonat).toBeGreaterThan(0);
    // Die Pflegeversicherung tragen Rentner allein und voll.
    expect(r.pvMonat).toBeCloseTo(r.bruttoRenteMonat * (0.036 + 0.006), 1);
  });

  it('lässt Brutto minus Abzüge genau das Netto ergeben', () => {
    expect(r.nettoRenteMonat).toBeCloseTo(r.bruttoRenteMonat - r.abzuegeMonat, 2);
    expect(r.abzuegeMonat).toBeCloseTo(
      r.kvMonat + r.pvMonat + r.einkommensteuerMonat + r.soliMonat + r.kirchensteuerMonat, 2,
    );
  });

  it('weist einen spürbaren Abstand zwischen Brutto und Netto aus', () => {
    expect(r.nettoRenteMonat).toBeLessThan(r.bruttoRenteMonat);
    expect(r.abzuegeMonat / r.bruttoRenteMonat).toBeGreaterThan(0.1);
    expect(r.hinweise.join(' ')).toMatch(/plant zu knapp/);
  });

  it('erhöht die Abzüge durch Kirchensteuer', () => {
    const mit = berechneRente(rente(), mitKirche, JETZT);
    expect(mit.nettoRenteMonat).toBeLessThanOrEqual(r.nettoRenteMonat);
  });

  it('rechnet den Wunschbetrag auf das Rentenjahr hoch', () => {
    const faktor = (1 + 2 / 100) ** r.jahreBisRente;
    expect(r.wunschNettoBeiRente).toBeGreaterThan(2_200);
    expect(r.wunschNettoBeiRente).toBeCloseTo(2_200 * faktor, 0);
  });

  it('weist die Lücke auch in heutiger Kaufkraft aus', () => {
    const faktor = (1 + 2 / 100) ** r.jahreBisRente;
    expect(r.lueckeHeutigeKaufkraft).toBeCloseTo(r.luecke / faktor, 1);
    expect(r.nettoRenteHeutigeKaufkraft).toBeCloseTo(r.nettoRenteMonat / faktor, 1);
  });

  it('erkennt, wenn keine Lücke besteht', () => {
    const reich = berechneRente(rente({
      entgeltpunkteBisher: 60, bruttoJahr: 90_000, wunschNettoHeute: 800,
    }), ohneKirche, JETZT);
    expect(reich.luecke).toBeLessThanOrEqual(0);
    expect(reich.deckungsgrad).toBeGreaterThanOrEqual(1);
    expect(reich.hinweise.join(' ')).toMatch(/deckt Ihren Wunschbetrag/);
  });

  it('weist auf die Beitragsbemessungsgrenze hin', () => {
    const hoch = berechneRente(rente({ bruttoJahr: 150_000 }), ohneKirche, JETZT);
    expect(hoch.hinweise.join(' ')).toMatch(/Beitragsbemessungsgrenze/);
    expect(hoch.entgeltpunkteProJahr)
      .toBeCloseTo(SV.bbgRvAvJahr / RENTE.durchschnittsentgelt, 6);
  });

  it('kommt mit einem Rentenbeginn in der Vergangenheit zurecht', () => {
    const alt = berechneRente(rente({ geburtsjahr: 1950, entgeltpunkteBisher: 40 }), ohneKirche, JETZT);
    expect(alt.jahreBisRente).toBe(0);
    expect(alt.bruttoRenteMonat).toBeGreaterThan(0);
    expect(alt.rentenwertBeiBeginn).toBeCloseTo(RENTE.rentenwert, 2);
  });

  it('bleibt bei null Entgeltpunkten bei null', () => {
    const leer = berechneRente(rente({
      entgeltpunkteBisher: 0, bruttoJahr: 0,
    }), ohneKirche, JETZT);
    expect(leer.bruttoRenteMonat).toBe(0);
    expect(leer.nettoRenteMonat).toBe(0);
  });
});

describe('Kapital für die Lücke', () => {
  it('wächst mit Lücke und Dauer', () => {
    const klein = kapitalFuerLuecke(500, 20, 5, 2);
    const gross = kapitalFuerLuecke(1_000, 20, 5, 2);
    const lang = kapitalFuerLuecke(500, 30, 5, 2);
    expect(gross).toBeCloseTo(klein * 2, 0);
    expect(lang).toBeGreaterThan(klein);
  });

  it('entspricht ohne Realrendite dem schlichten Produkt', () => {
    expect(kapitalFuerLuecke(1_000, 20, 2, 2)).toBeCloseTo(1_000 * 12 * 20, 0);
  });

  it('liefert für keine Lücke auch kein Kapital', () => {
    expect(kapitalFuerLuecke(0, 20, 5, 2)).toBe(0);
    expect(kapitalFuerLuecke(-100, 20, 5, 2)).toBe(0);
  });
});
