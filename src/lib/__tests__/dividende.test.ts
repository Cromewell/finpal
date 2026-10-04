import { describe, expect, it } from 'vitest';
import {
  anteilSumme, berechneDividende, bruttodividende, bruttoFuerNetto,
  defaultDividendenEingabe, portfolioFuerNetto, sparerPauschbetrag,
  type Depotposition, type DividendenEingabe, type SteuerlicheLage,
} from '../dividende';
import { KAPITAL } from '../constants';

const ohneKirche: SteuerlicheLage = { kirchensteuer: false, bundesland: 'NW' };
const mitKircheNW: SteuerlicheLage = { kirchensteuer: true, bundesland: 'NW' };   // 9 %
const mitKircheBY: SteuerlicheLage = { kirchensteuer: true, bundesland: 'BY' };   // 8 %

/** Depot aus einer einzigen Position. */
const einePosition = (teil: Partial<Depotposition> = {}): Depotposition[] => [{
  id: 'p1', name: 'Test', anteil: 100, rendite: 3,
  anlageart: 'aktien', quellensteuerProzent: 0, ...teil,
}];

/** Grundfall: Einzelaktien, Pauschbetrag bereits anderweitig verbraucht. */
const voll = (patch: Partial<DividendenEingabe> = {}): DividendenEingabe => ({
  ...defaultDividendenEingabe(),
  eingabeart: 'betrag',
  bruttoJahr: 1000,
  anlageart: 'aktien',
  pauschbetragVerbraucht: KAPITAL.sparerPauschbetrag,
  ...patch,
});

describe('Bruttodividende', () => {
  it('ergibt sich aus Portfoliowert und Rendite', () => {
    expect(bruttodividende({
      ...defaultDividendenEingabe(), eingabeart: 'portfolio', portfolio: 100_000,
      positionen: einePosition({ rendite: 3.5 }),
    })).toBe(3500);
  });

  it('nimmt bei direkter Eingabe den Betrag', () => {
    expect(bruttodividende(voll({ bruttoJahr: 2345.67 }))).toBe(2345.67);
  });

  it('wertet negative Eingaben als null', () => {
    expect(bruttodividende(voll({ bruttoJahr: -500 }))).toBe(0);
    expect(bruttodividende({
      ...defaultDividendenEingabe(), portfolio: -1000, positionen: einePosition({ rendite: 3 }),
    })).toBe(0);
  });
});

describe('Sparer-Pauschbetrag', () => {
  it('beträgt 1.000 € einzeln und 2.000 € zusammen', () => {
    expect(sparerPauschbetrag('einzeln')).toBe(1000);
    expect(sparerPauschbetrag('zusammen')).toBe(2000);
  });

  it('lässt eine Dividende darunter vollständig steuerfrei', () => {
    const r = berechneDividende(voll({ bruttoJahr: 900, pauschbetragVerbraucht: 0 }), ohneKirche);
    expect(r.steuernGesamt).toBe(0);
    expect(r.nettoJahr).toBe(900);
    expect(r.pauschbetragRest).toBe(100);
  });

  it('besteuert nur den übersteigenden Teil', () => {
    const r = berechneDividende(voll({ bruttoJahr: 1500, pauschbetragVerbraucht: 0 }), ohneKirche);
    expect(r.bemessungsgrundlage).toBe(500);
    expect(r.kapitalertragsteuer).toBe(125);
    expect(r.steuernGesamt).toBeCloseTo(125 + 6.88, 2);
  });

  it('verdoppelt die Freigrenze bei Zusammenveranlagung', () => {
    const r = berechneDividende(
      voll({ bruttoJahr: 1800, pauschbetragVerbraucht: 0, veranlagung: 'zusammen' }), ohneKirche);
    expect(r.steuernGesamt).toBe(0);
  });

  it('berücksichtigt anderweitig verbrauchten Pauschbetrag', () => {
    const r = berechneDividende(voll({ bruttoJahr: 1000, pauschbetragVerbraucht: 600 }), ohneKirche);
    expect(r.pauschbetragGenutzt).toBe(400);
    expect(r.bemessungsgrundlage).toBe(600);
  });
});

describe('Steuersätze', () => {
  it('belastet ohne Kirchensteuer mit 26,375 %', () => {
    const r = berechneDividende(voll(), ohneKirche);
    expect(r.kapitalertragsteuer).toBe(250);
    expect(r.soli).toBeCloseTo(13.75, 2);
    expect(r.kirchensteuer).toBe(0);
    expect(r.effektiverSteuersatz).toBeCloseTo(0.26375, 6);
  });

  it('belastet mit 9 % Kirchensteuer mit 27,99 % — nicht mit 28,63 %', () => {
    // Die verbreitete Rechnung „25 % + 5,5 % Soli + 9 % KiSt“ ergäbe 28,63 %.
    // Weil die Kirchensteuer als Sonderausgabe abziehbar ist, mindert sie die
    // Kapitalertragsteuer selbst: (e − 4q) / (4 + k).
    const r = berechneDividende(voll(), mitKircheNW);
    expect(r.kapitalertragsteuer).toBeCloseTo(1000 / 4.09, 2);
    // Auf Cent gerundet wie beim Bankabzug, daher vier Nachkommastellen.
    expect(r.effektiverSteuersatz).toBeCloseTo(0.27995, 4);
    expect(r.effektiverSteuersatz).toBeLessThan(0.2863);
  });

  it('belastet mit 8 % Kirchensteuer in Bayern mit 27,82 %', () => {
    const r = berechneDividende(voll(), mitKircheBY);
    expect(r.kapitalertragsteuer).toBeCloseTo(1000 / 4.08, 2);
    expect(r.effektiverSteuersatz).toBeCloseTo(0.278186, 5);
  });

  it('setzt die Kirchensteuer auf die Kapitalertragsteuer, nicht auf die Dividende', () => {
    const r = berechneDividende(voll(), mitKircheNW);
    expect(r.kirchensteuer).toBeCloseTo(r.kapitalertragsteuer * 0.09, 1);
    expect(r.soli).toBeCloseTo(r.kapitalertragsteuer * 0.055, 1);
  });

  it('lässt Brutto minus Steuern genau das Netto ergeben', () => {
    for (const lage of [ohneKirche, mitKircheNW, mitKircheBY]) {
      for (const betrag of [0, 500, 1000, 2500, 10_000, 100_000]) {
        const r = berechneDividende(voll({ bruttoJahr: betrag }), lage);
        expect(r.nettoJahr).toBeCloseTo(r.bruttoJahr - r.steuernGesamt, 2);
        expect(r.nettoMonat).toBeCloseTo(r.nettoJahr / 12, 2);
      }
    }
  });
});

describe('Teilfreistellung', () => {
  it('stellt bei Aktienfonds 30 % frei', () => {
    const r = berechneDividende(voll({ anlageart: 'aktienfonds' }), ohneKirche);
    expect(r.teilfreistellungssatz).toBe(0.3);
    expect(r.teilfreigestellt).toBe(300);
    expect(r.ertragSteuerpflichtig).toBe(700);
    expect(r.kapitalertragsteuer).toBe(175);
  });

  it('kennt die Sätze für Misch- und Immobilienfonds', () => {
    const satz = (anlageart: DividendenEingabe['anlageart']) =>
      berechneDividende(voll({ anlageart }), ohneKirche).teilfreistellungssatz;
    expect(satz('mischfonds')).toBe(0.15);
    expect(satz('immobilienfonds')).toBe(0.6);
    expect(satz('immobilienfondsAusland')).toBe(0.8);
    expect(satz('sonstigeFonds')).toBe(0);
    expect(satz('aktien')).toBe(0);
  });

  it('senkt die Steuerlast gegenüber Einzelaktien', () => {
    const aktien = berechneDividende(voll({ anlageart: 'aktien' }), ohneKirche);
    const fonds = berechneDividende(voll({ anlageart: 'aktienfonds' }), ohneKirche);
    expect(fonds.nettoJahr).toBeGreaterThan(aktien.nettoJahr);
    expect(fonds.effektiverSteuersatz).toBeCloseTo(0.26375 * 0.7, 4);
  });
});

describe('Ausländische Quellensteuer', () => {
  it('rechnet bis zum Höchstsatz voll an — und mindert dabei sogar den Soli', () => {
    const ohne = berechneDividende(voll({ quellensteuerProzent: 0 }), ohneKirche);
    const mit = berechneDividende(voll({ quellensteuerProzent: 15 }), ohneKirche);
    expect(mit.quellensteuer).toBe(150);
    expect(mit.quellensteuerAngerechnet).toBe(150);

    // Die Anrechnung mindert die Kapitalertragsteuer selbst — und damit auch
    // die Bemessungsgrundlage des Solidaritätszuschlags. Unterm Strich bleibt
    // deshalb genau der Soli auf den angerechneten Betrag mehr übrig.
    expect(mit.nettoJahr - ohne.nettoJahr).toBeCloseTo(150 * 0.055, 2);
    expect(mit.kapitalertragsteuer).toBe(100);
    expect(mit.soli).toBeCloseTo(5.5, 2);
  });

  it('lässt den Teil über dem Höchstsatz verfallen', () => {
    const r = berechneDividende(voll({ quellensteuerProzent: 35 }), ohneKirche);
    expect(r.quellensteuer).toBe(350);
    expect(r.quellensteuerAngerechnet).toBe(150);
    expect(r.quellensteuerVerloren).toBe(200);
    expect(r.hinweise.join(' ')).toMatch(/nur .* angerechnet/);
  });

  it('verfällt vollständig, wenn der Pauschbetrag alles abdeckt', () => {
    // Bekannter Effekt: Ohne inländische Steuer gibt es nichts anzurechnen.
    const r = berechneDividende(
      voll({ bruttoJahr: 800, pauschbetragVerbraucht: 0, quellensteuerProzent: 15 }), ohneKirche);
    expect(r.kapitalertragsteuer).toBe(0);
    expect(r.quellensteuerAngerechnet).toBe(0);
    expect(r.nettoJahr).toBe(800 - 120);
  });

  it('greift bei Fonds nicht — dort wird auf Fondsebene verrechnet', () => {
    const r = berechneDividende(voll({ anlageart: 'aktienfonds', quellensteuerProzent: 30 }), ohneKirche);
    expect(r.quellensteuer).toBe(0);
  });
});

describe('Rückrechnung', () => {
  const eingabe = voll({ pauschbetragVerbraucht: 0 });

  it('findet die Bruttodividende für ein gewünschtes Netto', () => {
    for (const ziel of [500, 1000, 5000, 24_000]) {
      const brutto = bruttoFuerNetto(ziel, eingabe, ohneKirche);
      const erreicht = berechneDividende({ ...eingabe, eingabeart: 'betrag', bruttoJahr: brutto }, ohneKirche);
      expect(erreicht.nettoJahr).toBeCloseTo(ziel, 1);
    }
  });

  it('rechnet auch mit Kirchensteuer und Teilfreistellung zurück', () => {
    const mitFonds = voll({ anlageart: 'aktienfonds', pauschbetragVerbraucht: 0 });
    const brutto = bruttoFuerNetto(18_000, mitFonds, mitKircheNW);
    const erreicht = berechneDividende({ ...mitFonds, eingabeart: 'betrag', bruttoJahr: brutto }, mitKircheNW);
    expect(erreicht.nettoJahr).toBeCloseTo(18_000, 1);
  });

  it('bleibt innerhalb des Pauschbetrags bei brutto gleich netto', () => {
    expect(bruttoFuerNetto(800, eingabe, ohneKirche)).toBeCloseTo(800, 1);
  });

  it('liefert für ein Ziel von null auch null', () => {
    expect(bruttoFuerNetto(0, eingabe, ohneKirche)).toBe(0);
    expect(bruttoFuerNetto(-100, eingabe, ohneKirche)).toBe(0);
  });

  it('errechnet den nötigen Depotwert aus der Aufteilung', () => {
    const depot: DividendenEingabe = {
      ...eingabe, eingabeart: 'portfolio', positionen: einePosition({ rendite: 4 }),
    };
    const noetig = portfolioFuerNetto(1000, depot, ohneKirche);
    expect(noetig).not.toBeNull();
    const geprueft = berechneDividende({ ...depot, portfolio: noetig! }, ohneKirche);
    expect(geprueft.nettoMonat).toBeCloseTo(1000, 0);
  });

  it('kann ohne Rendite keinen Depotwert nennen', () => {
    expect(portfolioFuerNetto(1000, {
      ...eingabe, eingabeart: 'portfolio', positionen: einePosition({ rendite: 0 }),
    }, ohneKirche)).toBeNull();
  });
});

describe('Kennzahlen', () => {
  it('weist die Nettorendite auf den Depotwert aus', () => {
    const r = berechneDividende({
      ...defaultDividendenEingabe(), eingabeart: 'portfolio', portfolio: 200_000,
      positionen: einePosition({ rendite: 3 }), pauschbetragVerbraucht: 1000,
    }, ohneKirche);
    expect(r.bruttoJahr).toBe(6000);
    expect(r.nettoRendite).toBeCloseTo(r.nettoJahr / 200_000, 8);
    expect(r.nettoRendite).toBeLessThan(0.03);
  });

  it('bleibt bei null Dividende überall bei null', () => {
    const r = berechneDividende(voll({ bruttoJahr: 0 }), mitKircheNW);
    expect(r.nettoJahr).toBe(0);
    expect(r.steuernGesamt).toBe(0);
    expect(r.effektiverSteuersatz).toBe(0);
  });

  it('lässt das Netto monoton mit der Dividende steigen', () => {
    let vorher = -1;
    for (let brutto = 0; brutto <= 30_000; brutto += 250) {
      const netto = berechneDividende(voll({ bruttoJahr: brutto, pauschbetragVerbraucht: 0 }), mitKircheNW).nettoJahr;
      expect(netto).toBeGreaterThan(vorher);
      vorher = netto;
    }
  });
});

describe('Hinweistexte', () => {
  it('nennt eine Dividende nur dann steuerfrei, wenn auch im Ausland nichts einbehalten wurde', () => {
    const rein = berechneDividende(
      voll({ bruttoJahr: 800, pauschbetragVerbraucht: 0 }), ohneKirche);
    expect(rein.hinweise.join(' ')).toMatch(/bleibt steuerfrei/);

    const mitAusland = berechneDividende(
      voll({ bruttoJahr: 800, pauschbetragVerbraucht: 0, quellensteuerProzent: 35 }), ohneKirche);
    expect(mitAusland.steuernGesamt).toBeGreaterThan(0);
    expect(mitAusland.hinweise.join(' ')).not.toMatch(/bleibt steuerfrei/);
    expect(mitAusland.hinweise.join(' ')).toMatch(/Im Inland fällt keine Steuer an/);
  });

  it('formatiert Beträge in Hinweisen deutsch', () => {
    const r = berechneDividende(voll({ quellensteuerProzent: 35 }), ohneKirche);
    const text = r.hinweise.join(' ');
    expect(text).toMatch(/350,00/);      // deutsches Dezimalkomma
    expect(text).not.toMatch(/350\.00/); // nicht die englische Schreibweise
  });
});

describe('Gemischtes Depot', () => {
  /** 70 % Aktien-ETF mit 2,5 %, 30 % Einzelaktien mit 4 %. */
  const gemischt = (teil: Partial<DividendenEingabe> = {}): DividendenEingabe => ({
    ...defaultDividendenEingabe(),
    eingabeart: 'portfolio',
    portfolio: 200_000,
    pauschbetragVerbraucht: 0,
    positionen: [
      { id: 'etf', name: 'Aktien-ETF', anteil: 70, rendite: 2.5, anlageart: 'aktienfonds', quellensteuerProzent: 0 },
      { id: 'akt', name: 'Einzelaktien', anteil: 30, rendite: 4, anlageart: 'aktien', quellensteuerProzent: 0 },
    ],
    ...teil,
  });

  it('teilt den Depotwert nach den Anteilen auf', () => {
    const r = berechneDividende(gemischt(), ohneKirche);
    expect(r.positionen.map((p) => p.depotwert)).toEqual([140_000, 60_000]);
    expect(r.positionen.map((p) => p.bruttoJahr)).toEqual([3500, 2400]);
    expect(r.bruttoJahr).toBe(5900);
  });

  it('weist die gewichtete Mischrendite aus', () => {
    // 0,7 × 2,5 % + 0,3 × 4 % = 2,95 %
    expect(berechneDividende(gemischt(), ohneKirche).mischrendite).toBeCloseTo(2.95, 4);
  });

  it('wendet die Teilfreistellung je Position an', () => {
    const r = berechneDividende(gemischt(), ohneKirche);
    expect(r.positionen[0]!.teilfreigestellt).toBe(1050); // 30 % von 3.500
    expect(r.positionen[1]!.teilfreigestellt).toBe(0);    // Einzelaktien
    expect(r.teilfreigestellt).toBe(1050);
    // Wirksamer Satz über das ganze Depot: 1.050 / 5.900
    expect(r.teilfreistellungssatz).toBeCloseTo(1050 / 5900, 8);
  });

  it('zieht den Sparer-Pauschbetrag nur einmal für das ganze Depot ab', () => {
    const r = berechneDividende(gemischt(), ohneKirche);
    expect(r.ertragSteuerpflichtig).toBe(5900 - 1050);
    expect(r.pauschbetragGenutzt).toBe(1000);
    expect(r.bemessungsgrundlage).toBe(3850);
    expect(r.kapitalertragsteuer).toBeCloseTo(3850 * 0.25, 2);
  });

  it('ergibt dasselbe wie zwei getrennt gerechnete Depots mit geteiltem Freibetrag', () => {
    const zusammen = berechneDividende(gemischt(), mitKircheNW);
    const nurEtf = berechneDividende(gemischt({
      positionen: [{ id: 'etf', name: 'ETF', anteil: 70, rendite: 2.5, anlageart: 'aktienfonds', quellensteuerProzent: 0 }],
      pauschbetragVerbraucht: 0,
    }), mitKircheNW);
    const nurAktien = berechneDividende(gemischt({
      positionen: [{ id: 'akt', name: 'Aktien', anteil: 30, rendite: 4, anlageart: 'aktien', quellensteuerProzent: 0 }],
      // Der ETF-Teil hat den Pauschbetrag bereits aufgebraucht.
      pauschbetragVerbraucht: nurEtf.pauschbetragGenutzt,
    }), mitKircheNW);
    expect(zusammen.steuernGesamt).toBeCloseTo(nurEtf.steuernGesamt + nurAktien.steuernGesamt, 1);
  });

  it('rechnet Quellensteuer nur auf der Aktienposition', () => {
    const r = berechneDividende(gemischt({
      positionen: [
        { id: 'etf', name: 'ETF', anteil: 70, rendite: 2.5, anlageart: 'aktienfonds', quellensteuerProzent: 30 },
        { id: 'akt', name: 'US-Aktien', anteil: 30, rendite: 4, anlageart: 'aktien', quellensteuerProzent: 15 },
      ],
    }), ohneKirche);
    expect(r.positionen[0]!.quellensteuer).toBe(0);      // Fonds: auf Fondsebene verrechnet
    expect(r.positionen[1]!.quellensteuer).toBe(360);    // 15 % von 2.400
    expect(r.quellensteuer).toBe(360);
  });

  it('bilanziert über alle Positionen hinweg', () => {
    for (const lage of [ohneKirche, mitKircheNW]) {
      const r = berechneDividende(gemischt(), lage);
      expect(r.bruttoJahr).toBeCloseTo(r.positionen.reduce((s, p) => s + p.bruttoJahr, 0), 2);
      expect(r.nettoJahr).toBeCloseTo(r.bruttoJahr - r.steuernGesamt, 2);
      expect(r.ertragSteuerpflichtig).toBeCloseTo(
        r.positionen.reduce((s, p) => s + p.steuerpflichtig, 0), 2);
    }
  });

  it('meldet, wenn die Anteile nicht 100 % ergeben', () => {
    const zuwenig = berechneDividende(gemischt({
      positionen: [
        { id: 'a', name: 'ETF', anteil: 70, rendite: 2.5, anlageart: 'aktienfonds', quellensteuerProzent: 0 },
        { id: 'b', name: 'Aktien', anteil: 20, rendite: 4, anlageart: 'aktien', quellensteuerProzent: 0 },
      ],
    }), ohneKirche);
    expect(zuwenig.anteilSumme).toBe(90);
    expect(zuwenig.hinweise.join(' ')).toMatch(/keine Dividende/);

    const zuviel = berechneDividende(gemischt({
      positionen: [
        { id: 'a', name: 'ETF', anteil: 70, rendite: 2.5, anlageart: 'aktienfonds', quellensteuerProzent: 0 },
        { id: 'b', name: 'Aktien', anteil: 50, rendite: 4, anlageart: 'aktien', quellensteuerProzent: 0 },
      ],
    }), ohneKirche);
    expect(zuviel.anteilSumme).toBe(120);
    expect(zuviel.hinweise.join(' ')).toMatch(/mehr als das ganze Depot/);
  });

  it('skaliert alle Positionen anteilig, wenn das Depot wächst', () => {
    const klein = berechneDividende(gemischt({ portfolio: 100_000 }), ohneKirche);
    const gross = berechneDividende(gemischt({ portfolio: 300_000 }), ohneKirche);
    expect(gross.bruttoJahr).toBeCloseTo(klein.bruttoJahr * 3, 2);
    expect(gross.positionen[0]!.depotwert).toBe(210_000);
    // Netto wächst unterproportional: Der Pauschbetrag wirkt nur einmal.
    expect(gross.nettoJahr).toBeLessThan(klein.nettoJahr * 3);
  });

  it('findet den nötigen Depotwert bei gemischter Aufteilung', () => {
    const noetig = portfolioFuerNetto(1500, gemischt(), ohneKirche);
    expect(noetig).not.toBeNull();
    const geprueft = berechneDividende(gemischt({ portfolio: noetig! }), ohneKirche);
    expect(geprueft.nettoMonat).toBeCloseTo(1500, 0);
  });

  it('kommt mit einem leeren Depot zurecht', () => {
    const r = berechneDividende(gemischt({ positionen: [] }), ohneKirche);
    expect(r.bruttoJahr).toBe(0);
    expect(r.nettoJahr).toBe(0);
    expect(portfolioFuerNetto(1000, gemischt({ positionen: [] }), ohneKirche)).toBeNull();
  });

  it('summiert Anteile für die Anzeige', () => {
    expect(anteilSumme([
      { id: 'a', name: '', anteil: 70, rendite: 1, anlageart: 'aktien', quellensteuerProzent: 0 },
      { id: 'b', name: '', anteil: 30, rendite: 1, anlageart: 'aktien', quellensteuerProzent: 0 },
    ])).toBe(100);
    expect(anteilSumme([])).toBe(0);
  });
});
