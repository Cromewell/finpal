import { describe, expect, it } from 'vitest';
import {
  berechneEntnahme, defaultEntnahmeEingabe, startkapitalFuer,
  type EntnahmeEingabe, type SteuerlicheLage,
} from '../entnahme';

const ohneKirche: SteuerlicheLage = { kirchensteuer: false, bundesland: 'NW' };
const mitKirche: SteuerlicheLage = { kirchensteuer: true, bundesland: 'NW' };

const plan = (teil: Partial<EntnahmeEingabe> = {}): EntnahmeEingabe => ({
  ...defaultEntnahmeEingabe(), ...teil,
});

describe('Entnahmeplan', () => {
  const r = berechneEntnahme(plan({ inflation: 0 }), ohneKirche);

  it('liefert die gewünschte Entnahme nach Steuern', () => {
    for (const j of r.jahre) {
      expect(j.entnahmeNetto).toBeCloseTo(1_500 * 12, 0);
    }
  });

  it('entnimmt brutto mehr als netto, sobald Steuer anfällt', () => {
    const mitSteuer = r.jahre.filter((j) => j.steuern > 0);
    expect(mitSteuer.length).toBeGreaterThan(0);
    for (const j of mitSteuer) {
      expect(j.entnahmeBrutto).toBeGreaterThan(j.entnahmeNetto);
      expect(j.entnahmeBrutto - j.entnahmeNetto).toBeCloseTo(j.steuern, 1);
    }
  });

  it('schreibt das Kapital schlüssig fort', () => {
    for (const j of r.jahre) {
      expect(j.kapitalEnde).toBeCloseTo(j.kapitalAnfang + j.wertzuwachs - j.entnahmeBrutto, 0);
    }
  });

  it('reicht das Kapital von Jahr zu Jahr durch', () => {
    for (let i = 1; i < r.jahre.length; i++) {
      expect(r.jahre[i]!.kapitalAnfang).toBeCloseTo(r.jahre[i - 1]!.kapitalEnde, 2);
    }
  });

  it('lässt den Gewinnanteil über die Jahre steigen', () => {
    // Je länger entnommen wird, desto weniger Einstandswert steckt im Depot.
    expect(r.jahre[r.jahre.length - 1]!.gewinnanteil)
      .toBeGreaterThan(r.jahre[0]!.gewinnanteil);
  });

  it('lässt deshalb auch die Steuerlast steigen', () => {
    const erstes = r.jahre[0]!;
    const letztes = r.jahre[r.jahre.length - 1]!;
    expect(letztes.steuern).toBeGreaterThan(erstes.steuern);
    expect(r.hinweise.join(' ')).toMatch(/mehr Gewinn und weniger Einstandswert/);
  });
});

describe('Besteuerung', () => {
  it('besteuert nur den Gewinn, nicht die ganze Entnahme', () => {
    // Einstand gleich Depotwert: Es gibt noch keinen Gewinn, also im ersten
    // Jahr nur Steuer auf den frischen Wertzuwachs.
    const ohneGewinn = berechneEntnahme(plan({
      startkapital: 500_000, einstandswert: 500_000, inflation: 0, dauerJahre: 1,
    }), ohneKirche);
    const vielGewinn = berechneEntnahme(plan({
      startkapital: 500_000, einstandswert: 50_000, inflation: 0, dauerJahre: 1,
    }), ohneKirche);
    expect(ohneGewinn.jahre[0]!.steuern).toBeLessThan(vielGewinn.jahre[0]!.steuern);
  });

  it('bleibt steuerfrei, solange der Gewinn im Sparer-Pauschbetrag bleibt', () => {
    const r = berechneEntnahme(plan({
      startkapital: 200_000, einstandswert: 199_000, entnahmeNettoMonat: 300,
      rendite: 0, inflation: 0, dauerJahre: 1,
    }), ohneKirche);
    expect(r.jahre[0]!.steuern).toBe(0);
    expect(r.jahre[0]!.entnahmeBrutto).toBeCloseTo(r.jahre[0]!.entnahmeNetto, 2);
  });

  it('senkt die Steuer durch die Teilfreistellung bei Fonds', () => {
    const aktien = berechneEntnahme(plan({ anlageart: 'aktien', inflation: 0 }), ohneKirche);
    const fonds = berechneEntnahme(plan({ anlageart: 'aktienfonds', inflation: 0 }), ohneKirche);
    expect(fonds.steuernGesamt).toBeLessThan(aktien.steuernGesamt);
  });

  it('erhöht die Steuer durch Kirchensteuer', () => {
    const ohne = berechneEntnahme(plan({ inflation: 0 }), ohneKirche);
    const mit = berechneEntnahme(plan({ inflation: 0 }), mitKirche);
    expect(mit.steuernGesamt).toBeGreaterThan(ohne.steuernGesamt);
  });

  it('entlastet Paare über den doppelten Pauschbetrag', () => {
    const einzeln = berechneEntnahme(plan({ inflation: 0 }), ohneKirche);
    const paar = berechneEntnahme(plan({ inflation: 0, veranlagung: 'zusammen' }), ohneKirche);
    expect(paar.steuernGesamt).toBeLessThan(einzeln.steuernGesamt);
  });
});

describe('Reichweite', () => {
  it('erkennt, wenn das Kapital vorzeitig aufgebraucht ist', () => {
    const r = berechneEntnahme(plan({
      startkapital: 100_000, einstandswert: 60_000, entnahmeNettoMonat: 2_000,
      rendite: 2, dauerJahre: 30,
    }), ohneKirche);
    expect(r.traegtDurch).toBe(false);
    expect(r.reichweiteMonate).not.toBeNull();
    expect(r.reichweiteMonate! / 12).toBeLessThan(10);
    expect(r.hinweise.join(' ')).toMatch(/aufgebraucht/);
  });

  it('trägt durch, wenn die Rendite die Entnahme übersteigt', () => {
    const r = berechneEntnahme(plan({
      startkapital: 1_000_000, einstandswert: 800_000, entnahmeNettoMonat: 1_000,
      rendite: 6, inflation: 0, dauerJahre: 30,
    }), ohneKirche);
    expect(r.traegtDurch).toBe(true);
    expect(r.kapitalAmEnde).toBeGreaterThan(1_000_000);
    expect(r.hinweise.join(' ')).toMatch(/wächst trotz der Entnahmen/);
  });

  it('verkürzt die Reichweite durch Inflationsanpassung', () => {
    const starr = berechneEntnahme(plan({ inflation: 0, dauerJahre: 40 }), ohneKirche);
    const dynamisch = berechneEntnahme(plan({ inflation: 3, dauerJahre: 40 }), ohneKirche);
    expect(dynamisch.kapitalAmEnde).toBeLessThan(starr.kapitalAmEnde);
  });

  it('hält die Kaufkraft der Entnahme konstant', () => {
    const r = berechneEntnahme(plan({ inflation: 2, dauerJahre: 20 }), ohneKirche);
    for (const j of r.jahre) {
      expect(j.entnahmeNettoHeutigeKaufkraft).toBeCloseTo(1_500 * 12, 0);
    }
    // Nominal steigt sie dagegen deutlich.
    expect(r.jahre[r.jahre.length - 1]!.entnahmeNetto)
      .toBeGreaterThan(r.jahre[0]!.entnahmeNetto * 1.3);
  });
});

describe('Benötigtes Startkapital', () => {
  it('findet den Betrag, der gerade durchträgt', () => {
    const eingabe = plan({ inflation: 2, dauerJahre: 30, entnahmeNettoMonat: 2_000 });
    const noetig = startkapitalFuer(eingabe, ohneKirche);
    const anteil = eingabe.einstandswert / eingabe.startkapital;

    const knappDrunter = berechneEntnahme({
      ...eingabe, startkapital: noetig * 0.97, einstandswert: noetig * 0.97 * anteil,
    }, ohneKirche);
    const genau = berechneEntnahme({
      ...eingabe, startkapital: noetig, einstandswert: noetig * anteil,
    }, ohneKirche);

    expect(genau.traegtDurch).toBe(true);
    expect(knappDrunter.traegtDurch).toBe(false);
  });

  it('braucht mehr Kapital bei höherer Entnahme', () => {
    const wenig = startkapitalFuer(plan({ entnahmeNettoMonat: 1_000 }), ohneKirche);
    const viel = startkapitalFuer(plan({ entnahmeNettoMonat: 3_000 }), ohneKirche);
    expect(viel).toBeGreaterThan(wenig * 2);
  });

  it('liefert für eine Entnahme von null auch null', () => {
    expect(startkapitalFuer(plan({ entnahmeNettoMonat: 0 }), ohneKirche)).toBe(0);
  });
});

describe('Randfälle', () => {
  it('kommt mit leerem Depot zurecht', () => {
    const r = berechneEntnahme(plan({ startkapital: 0, einstandswert: 0 }), ohneKirche);
    expect(r.jahre).toHaveLength(0);
    expect(r.steuernGesamt).toBe(0);
  });

  it('begrenzt den Einstandswert auf den Depotwert', () => {
    const r = berechneEntnahme(plan({
      startkapital: 100_000, einstandswert: 500_000, inflation: 0, dauerJahre: 2,
    }), ohneKirche);
    expect(r.jahre[0]!.gewinnanteil).toBeGreaterThanOrEqual(0);
  });

  it('rechnet auch ohne Rendite sinnvoll', () => {
    const r = berechneEntnahme(plan({
      startkapital: 120_000, einstandswert: 120_000, entnahmeNettoMonat: 1_000,
      rendite: 0, inflation: 0, dauerJahre: 15,
    }), ohneKirche);
    expect(r.reichweiteMonate! / 12).toBeCloseTo(10, 0);
  });
});
