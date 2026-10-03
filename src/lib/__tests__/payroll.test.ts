import { describe, expect, it } from 'vitest';
import { berechneGehalt, defaultPayrollInput, type PayrollInput } from '../payroll';
import { SV, STEUER } from '../constants';

const eingabe = (patch: Partial<PayrollInput> = {}): PayrollInput => ({
  ...defaultPayrollInput(),
  ...patch,
});

describe('Entgeltabrechnung', () => {
  it('rechnet Monats- und Jahreswerte konsistent', () => {
    const r = berechneGehalt(eingabe());
    expect(r.brutto.jahr).toBeCloseTo(r.brutto.monat * 12, 2);
    expect(r.netto.jahr).toBeCloseTo(r.netto.monat * 12, 2);
  });

  it('lässt Brutto minus Abzüge genau das Netto ergeben', () => {
    for (const brutto of [800, 1500, 2500, 4000, 6500, 12_000]) {
      const r = berechneGehalt(eingabe({ bruttoMonat: brutto }));
      expect(r.netto.monat).toBeCloseTo(r.brutto.monat - r.abzuege.monat, 2);
      expect(r.abzuege.monat).toBeCloseTo(
        r.steuern.monat + r.sv.an.summe + r.pkvEigenanteil.monat, 2,
      );
      expect(r.steuern.monat).toBeCloseTo(
        r.lohnsteuer.monat + r.soli.monat + r.kirchensteuer.monat, 2,
      );
    }
  });

  it('liefert bei null Brutto durchweg null', () => {
    const r = berechneGehalt(eingabe({ bruttoMonat: 0 }));
    expect(r.netto.monat).toBe(0);
    expect(r.abzuege.monat).toBe(0);
    expect(r.abgabenquote).toBe(0);
  });

  it('hält das Netto unter dem Brutto und über null', () => {
    for (const brutto of [700, 1200, 3000, 8000, 25_000]) {
      const r = berechneGehalt(eingabe({ bruttoMonat: brutto }));
      expect(r.netto.monat).toBeGreaterThan(0);
      expect(r.netto.monat).toBeLessThan(r.brutto.monat);
    }
  });

  it('lässt das Netto monoton mit dem Brutto steigen', () => {
    let vorher = -1;
    for (let brutto = 400; brutto <= 15_000; brutto += 100) {
      const netto = berechneGehalt(eingabe({ bruttoMonat: brutto })).netto.monat;
      expect(netto).toBeGreaterThan(vorher);
      vorher = netto;
    }
  });

  it('erhebt unterhalb des Grundfreibetrags keine Lohnsteuer', () => {
    const r = berechneGehalt(eingabe({ bruttoMonat: STEUER.grundfreibetrag / 12 }));
    expect(r.lohnsteuer.monat).toBe(0);
  });

  it('ordnet die Steuerklassen nach ihrer Belastung', () => {
    const netto = (steuerklasse: PayrollInput['steuerklasse']) =>
      berechneGehalt(eingabe({ bruttoMonat: 3500, steuerklasse })).netto.monat;
    expect(netto(3)).toBeGreaterThan(netto(1));
    expect(netto(1)).toBeGreaterThan(netto(5));
    expect(netto(5)).toBeGreaterThanOrEqual(netto(6));
    expect(netto(2)).toBeGreaterThan(netto(1)); // Entlastungsbetrag Alleinerziehende
  });

  it('senkt die Lohnsteuer durch Kinderfreibeträge nicht, wohl aber Soli und Kirchensteuer', () => {
    const ohne = berechneGehalt(eingabe({ bruttoMonat: 9000, kirchensteuer: true, kinderfreibetraege: 0 }));
    const mit = berechneGehalt(eingabe({ bruttoMonat: 9000, kirchensteuer: true, kinderfreibetraege: 2 }));
    expect(mit.lohnsteuer.monat).toBe(ohne.lohnsteuer.monat);
    expect(mit.kirchensteuer.monat).toBeLessThan(ohne.kirchensteuer.monat);
    expect(mit.netto.monat).toBeGreaterThan(ohne.netto.monat);
  });

  it('erhebt Kirchensteuer in Bayern mit 8 % statt 9 %', () => {
    const by = berechneGehalt(eingabe({ bruttoMonat: 4000, kirchensteuer: true, bundesland: 'BY' }));
    const nw = berechneGehalt(eingabe({ bruttoMonat: 4000, kirchensteuer: true, bundesland: 'NW' }));
    expect(by.kirchensteuersatz).toBe(0.08);
    expect(nw.kirchensteuersatz).toBe(0.09);
    expect(by.kirchensteuer.monat).toBeLessThan(nw.kirchensteuer.monat);
    expect(by.kirchensteuer.monat / nw.kirchensteuer.monat).toBeCloseTo(8 / 9, 2);
  });

  it('erhebt ohne Religionszugehörigkeit keine Kirchensteuer', () => {
    expect(berechneGehalt(eingabe({ bruttoMonat: 5000, kirchensteuer: false })).kirchensteuer.monat).toBe(0);
  });

  it('verschont normale Einkommen vom Solidaritätszuschlag', () => {
    expect(berechneGehalt(eingabe({ bruttoMonat: 5000 })).soli.monat).toBe(0);
  });

  it('erhebt Solidaritätszuschlag erst oberhalb der Freigrenze', () => {
    const hoch = berechneGehalt(eingabe({ bruttoMonat: 15_000 }));
    expect(hoch.lohnsteuer.jahr).toBeGreaterThan(STEUER.soliFreigrenze);
    expect(hoch.soli.monat).toBeGreaterThan(0);
    expect(hoch.soli.jahr / hoch.lohnsteuer.jahr).toBeLessThanOrEqual(0.055 + 1e-9);
  });

  it('berücksichtigt den Zusatzbeitrag der Krankenkasse', () => {
    const guenstig = berechneGehalt(eingabe({ bruttoMonat: 4000, zusatzbeitrag: 1.0 }));
    const teuer = berechneGehalt(eingabe({ bruttoMonat: 4000, zusatzbeitrag: 4.0 }));
    expect(guenstig.netto.monat).toBeGreaterThan(teuer.netto.monat);
    expect(teuer.sv.an.kv - guenstig.sv.an.kv).toBeCloseTo(4000 * 0.015, 2);
  });

  it('erhöht das Netto durch einen Steuerfreibetrag', () => {
    const ohne = berechneGehalt(eingabe({ bruttoMonat: 4000 }));
    const mit = berechneGehalt(eingabe({ bruttoMonat: 4000, freibetragJahr: 2400 }));
    expect(mit.lohnsteuer.monat).toBeLessThan(ohne.lohnsteuer.monat);
    expect(mit.netto.monat).toBeGreaterThan(ohne.netto.monat);
  });

  it('senkt das Netto durch einen Hinzurechnungsbetrag', () => {
    const ohne = berechneGehalt(eingabe({ bruttoMonat: 4000 }));
    const mit = berechneGehalt(eingabe({ bruttoMonat: 4000, hinzurechnungJahr: 2400 }));
    expect(mit.netto.monat).toBeLessThan(ohne.netto.monat);
  });

  it('bleibt im Minijob steuerfrei und abgabenfrei', () => {
    const r = berechneGehalt(eingabe({ bruttoMonat: 550 }));
    expect(r.sv.modus).toBe('minijob');
    expect(r.lohnsteuer.monat).toBe(0);
    expect(r.netto.monat).toBe(550);
    expect(r.hinweise.some((h) => h.text.includes('Minijob'))).toBe(true);
  });

  it('weist Arbeitgeberkosten als Brutto plus Arbeitgeberanteil aus', () => {
    const r = berechneGehalt(eingabe({ bruttoMonat: 4000 }));
    expect(r.arbeitgeberkosten.monat).toBeCloseTo(r.brutto.monat + r.sv.ag.summe, 2);
    expect(r.sv.ag.summe).toBeGreaterThan(0);
  });

  it('gewährt Steuerklasse IV mit Faktor einen niedrigeren Abzug', () => {
    const ohne = berechneGehalt(eingabe({ bruttoMonat: 4000, steuerklasse: 4 }));
    const mit = berechneGehalt(eingabe({ bruttoMonat: 4000, steuerklasse: 4, faktor: 0.9 }));
    expect(mit.lohnsteuer.monat).toBeLessThan(ohne.lohnsteuer.monat);
  });

  it('entlastet über den Altersentlastungsbetrag', () => {
    const jung = berechneGehalt(eingabe({ bruttoMonat: 4000, geburtsjahr: 1990 }));
    const alt = berechneGehalt(eingabe({ bruttoMonat: 4000, geburtsjahr: 1955 }));
    expect(alt.lohnsteuer.monat).toBeLessThan(jung.lohnsteuer.monat);
  });

  it('hält die Abgabenquote in plausiblen Grenzen', () => {
    const r = berechneGehalt(eingabe({ bruttoMonat: 4000 }));
    expect(r.abgabenquote).toBeGreaterThan(0.25);
    expect(r.abgabenquote).toBeLessThan(0.45);
  });

  it('lässt die Abgabenquote mit dem Einkommen steigen', () => {
    const klein = berechneGehalt(eingabe({ bruttoMonat: 2500 }));
    const gross = berechneGehalt(eingabe({ bruttoMonat: 7000 }));
    expect(gross.abgabenquote).toBeGreaterThan(klein.abgabenquote);
  });

  it('weist jenseits der Beitragsbemessungsgrenze einen Hinweis aus', () => {
    const r = berechneGehalt(eingabe({ bruttoMonat: 9000 }));
    expect(r.hinweise.some((h) => h.text.includes('Beitragsbemessungsgrenze'))).toBe(true);
  });

  it('übernimmt bei privater Versicherung den Eigenanteil in die Abzüge', () => {
    const r = berechneGehalt(eingabe({
      bruttoMonat: 7000, kvTyp: 'privat', pkvKrankenMonat: 700, pkvPflegeMonat: 100,
    }));
    expect(r.sv.an.kv).toBe(0);
    expect(r.pkvEigenanteil.monat).toBeGreaterThan(0);
    expect(r.netto.monat).toBeCloseTo(r.brutto.monat - r.abzuege.monat, 2);
  });

  it('kennt den Grenzwert zur privaten Krankenversicherung', () => {
    const r = berechneGehalt(eingabe({ bruttoMonat: SV.jaegJahr / 12 + 500 }));
    expect(r.hinweise.some((h) => h.text.includes('Versicherungspflicht'))).toBe(true);
  });
});
