import { describe, expect, it } from 'vitest';
import {
  ausgabeBetrag, beispielBudget, budgetSummen, leeresBudget, neueId,
  type Budget,
} from '../budget';
import { baueSankey, STANDARD_MASSE } from '../sankey';

const budget = (teil: Partial<Budget> = {}): Budget => ({
  einnahmen: [{ id: 'e1', name: 'Gehalt', betrag: 3000 }],
  ausgaben: [{ id: 'a1', name: 'Wohnen', betrag: 1200, unterposten: [] }],
  ...teil,
});

describe('Ausgabenbetrag', () => {
  it('nimmt den eigenen Wert, solange es keine Unterposten gibt', () => {
    expect(ausgabeBetrag({ id: 'a', name: 'X', betrag: 250, unterposten: [] })).toBe(250);
  });

  it('summiert die Unterposten und übergeht dann den eigenen Wert', () => {
    expect(ausgabeBetrag({
      id: 'a', name: 'X', betrag: 999,
      unterposten: [
        { id: 'u1', name: 'A', betrag: 100 },
        { id: 'u2', name: 'B', betrag: 55.5 },
      ],
    })).toBe(155.5);
  });

  it('wertet negative Eingaben als null', () => {
    expect(ausgabeBetrag({ id: 'a', name: 'X', betrag: -50, unterposten: [] })).toBe(0);
  });
});

describe('Budgetsummen', () => {
  it('bildet Saldo und Sparquote', () => {
    const s = budgetSummen(budget());
    expect(s.einnahmen).toBe(3000);
    expect(s.ausgaben).toBe(1200);
    expect(s.saldo).toBe(1800);
    expect(s.sparquote).toBeCloseTo(0.6, 10);
  });

  it('weist einen Fehlbetrag als negativen Saldo aus', () => {
    const s = budgetSummen(budget({
      ausgaben: [{ id: 'a1', name: 'Wohnen', betrag: 3500, unterposten: [] }],
    }));
    expect(s.saldo).toBe(-500);
    expect(s.sparquote).toBe(0);
  });

  it('findet den größten Posten samt Anteil', () => {
    const s = budgetSummen(budget({
      ausgaben: [
        { id: 'a1', name: 'Wohnen', betrag: 1200, unterposten: [] },
        { id: 'a2', name: 'Essen', betrag: 450, unterposten: [] },
      ],
    }));
    expect(s.groessterPosten?.name).toBe('Wohnen');
    expect(s.groessterPosten?.anteil).toBeCloseTo(0.4, 10);
  });

  it('kommt mit einem leeren Budget zurecht', () => {
    const s = budgetSummen({ einnahmen: [], ausgaben: [] });
    expect(s).toMatchObject({ einnahmen: 0, ausgaben: 0, saldo: 0, sparquote: 0, groessterPosten: null });
  });

  it('rechnet das Beispielbudget stimmig durch', () => {
    const s = budgetSummen(beispielBudget());
    expect(s.einnahmen).toBeGreaterThan(0);
    expect(s.saldo).toBeCloseTo(s.einnahmen - s.ausgaben, 2);
    expect(s.saldo).toBeGreaterThan(0); // Beispiel soll einen Überschuss zeigen
  });

  it('vergibt eindeutige Kennungen', () => {
    const ids = new Set(Array.from({ length: 200 }, () => neueId('x')));
    expect(ids.size).toBe(200);
  });

  it('liefert ein benutzbares leeres Budget', () => {
    const leer = leeresBudget();
    expect(leer.einnahmen).toHaveLength(1);
    expect(budgetSummen(leer).einnahmen).toBe(0);
  });
});

describe('Sankey-Layout', () => {
  const layout = baueSankey(beispielBudget());

  it('liefert für ein leeres Budget nichts zu zeichnen', () => {
    const leer = baueSankey({ einnahmen: [], ausgaben: [] });
    expect(leer.leer).toBe(true);
    expect(leer.knoten).toHaveLength(0);
    expect(leer.fluesse).toHaveLength(0);
  });

  it('übergeht Posten ohne Betrag', () => {
    const l = baueSankey(budget({
      einnahmen: [
        { id: 'e1', name: 'Gehalt', betrag: 3000 },
        { id: 'e2', name: 'Leer', betrag: 0 },
      ],
    }));
    expect(knotenIn(l, 'e2')).toBeUndefined();
    expect(knotenIn(l, 'e1')).toBeDefined();
  });

  function knotenIn(l: ReturnType<typeof baueSankey>, id: string) {
    return l.knoten.find((k) => k.id === id);
  }

  it('erhält die Menge über alle Spalten hinweg', () => {
    const proSpalte = new Map<number, number>();
    for (const k of layout.knoten) {
      proSpalte.set(k.spalte, (proSpalte.get(k.spalte) ?? 0) + k.wert);
    }
    expect(proSpalte.get(0)).toBeCloseTo(layout.summe, 2); // Einnahmen
    expect(proSpalte.get(1)).toBeCloseTo(layout.summe, 2); // Topf
    expect(proSpalte.get(2)).toBeCloseTo(layout.summe, 2); // Ausgaben + Überschuss
  });

  it('zeichnet Höhen streng im Verhältnis zum Betrag', () => {
    const massstab = layout.knoten.map((k) => (k.y1 - k.y0) / k.wert);
    for (const m of massstab) expect(m).toBeCloseTo(massstab[0]!, 6);
  });

  it('hält alle Knoten innerhalb der Zeichenfläche', () => {
    for (const k of layout.knoten) {
      expect(k.y0).toBeGreaterThanOrEqual(0);
      expect(k.y1).toBeLessThanOrEqual(STANDARD_MASSE.hoehe + 0.001);
      expect(k.x0).toBeGreaterThanOrEqual(0);
      expect(k.x1).toBeLessThanOrEqual(STANDARD_MASSE.breite + 0.001);
    }
  });

  it('lässt Knoten einer Spalte einander nicht überlappen', () => {
    for (const spalte of [0, 2]) {
      const reihe = layout.knoten.filter((k) => k.spalte === spalte).sort((a, b) => a.y0 - b.y0);
      for (let i = 1; i < reihe.length; i++) {
        expect(reihe[i]!.y0).toBeGreaterThanOrEqual(reihe[i - 1]!.y1 - 0.001);
      }
    }
  });

  it('füllt mit den Unterposten das Band ihrer Ausgabe genau aus', () => {
    for (const eltern of layout.knoten.filter((k) => k.art === 'ausgabe')) {
      const kinder = layout.fluesse
        .filter((f) => f.von === eltern.id)
        .map((f) => layout.knoten.find((k) => k.id === f.nach)!);
      if (kinder.length === 0) continue;
      const hoehe = kinder.reduce((s, k) => s + (k.y1 - k.y0), 0);
      expect(hoehe).toBeCloseTo(eltern.y1 - eltern.y0, 6);
      expect(kinder[0]!.y0).toBeCloseTo(eltern.y0, 6);
    }
  });

  it('verbindet jeden Knoten mit dem Topf', () => {
    const einnahmen = layout.knoten.filter((k) => k.art === 'einnahme');
    for (const e of einnahmen) {
      expect(layout.fluesse.some((f) => f.von === e.id && f.nach === 'gesamt')).toBe(true);
    }
    for (const a of layout.knoten.filter((k) => k.art === 'ausgabe')) {
      expect(layout.fluesse.some((f) => f.von === 'gesamt' && f.nach === a.id)).toBe(true);
    }
  });

  it('bilanziert den Topf: was hineinfließt, fließt heraus', () => {
    const rein = layout.fluesse.filter((f) => f.nach === 'gesamt').reduce((s, f) => s + f.wert, 0);
    const raus = layout.fluesse.filter((f) => f.von === 'gesamt').reduce((s, f) => s + f.wert, 0);
    expect(rein).toBeCloseTo(raus, 2);
    expect(rein).toBeCloseTo(layout.summe, 2);
  });

  it('zeigt bei Unterdeckung eine zusätzliche Quelle statt eines negativen Knotens', () => {
    const l = baueSankey(budget({
      ausgaben: [{ id: 'a1', name: 'Wohnen', betrag: 3500, unterposten: [] }],
    }));
    const luecke = l.knoten.find((k) => k.art === 'fehlbetrag');
    expect(luecke?.wert).toBe(500);
    expect(l.knoten.some((k) => k.art === 'ueberschuss')).toBe(false);
    for (const k of l.knoten) expect(k.wert).toBeGreaterThan(0);
  });

  it('weist bei Deckungsgleichheit weder Überschuss noch Fehlbetrag aus', () => {
    const l = baueSankey(budget({
      ausgaben: [{ id: 'a1', name: 'Wohnen', betrag: 3000, unterposten: [] }],
    }));
    expect(l.knoten.some((k) => k.art === 'ueberschuss' || k.art === 'fehlbetrag')).toBe(false);
  });

  it('kommt ohne Unterposten mit drei Spalten aus', () => {
    const l = baueSankey(budget());
    expect(Math.max(...l.knoten.map((k) => k.spalte))).toBe(2);
  });

  it('erzeugt für jedes Band einen geschlossenen Pfad', () => {
    for (const f of layout.fluesse) {
      expect(f.pfad.startsWith('M')).toBe(true);
      expect(f.pfad.endsWith('Z')).toBe(true);
      expect(f.pfad).not.toContain('NaN');
    }
  });

  it('räumt aufgefächert jedem Ende genug Platz für seine Beschriftung ein', () => {
    const lueckeEnden = 20;
    const gefaechert = baueSankey(beispielBudget(), {
      hoehe: 900, aufgefaechert: true, lueckeEnden,
    });
    const enden = gefaechert.knoten
      .filter((k) => k.spalte === 3)
      .sort((a, b) => a.y0 - b.y0);
    expect(enden.length).toBeGreaterThan(5);
    for (let i = 1; i < enden.length; i++) {
      const abstand = enden[i]!.y0 - enden[i - 1]!.y1;
      expect(abstand, `${enden[i - 1]!.name} → ${enden[i]!.name}`).toBeGreaterThanOrEqual(lueckeEnden - 0.001);
    }
  });

  it('bleibt aufgefächert mengentreu und maßstabsgetreu', () => {
    const gefaechert = baueSankey(beispielBudget(), { hoehe: 900, aufgefaechert: true });
    const massstab = gefaechert.knoten.map((k) => (k.y1 - k.y0) / k.wert);
    for (const ma of massstab) expect(ma).toBeCloseTo(massstab[0]!, 6);

    const rein = gefaechert.fluesse.filter((f) => f.nach === 'gesamt').reduce((s, f) => s + f.wert, 0);
    const raus = gefaechert.fluesse.filter((f) => f.von === 'gesamt').reduce((s, f) => s + f.wert, 0);
    expect(rein).toBeCloseTo(raus, 2);

    for (const k of gefaechert.knoten) {
      expect(k.y0).toBeGreaterThanOrEqual(-0.001);
      expect(k.y1).toBeLessThanOrEqual(900.001);
    }
  });

  it('füllt bündig weiterhin das Band der Ausgabe genau aus', () => {
    const buendig = baueSankey(beispielBudget(), { aufgefaechert: false });
    for (const eltern of buendig.knoten.filter((k) => k.art === 'ausgabe')) {
      const kinder = buendig.fluesse
        .filter((f) => f.von === eltern.id)
        .map((f) => buendig.knoten.find((k) => k.id === f.nach)!);
      if (kinder.length === 0) continue;
      expect(kinder.reduce((s, k) => s + (k.y1 - k.y0), 0)).toBeCloseTo(eltern.y1 - eltern.y0, 6);
    }
  });

  it('lässt die Bänder auch aufgefächert am Elternknoten lückenlos abgehen', () => {
    const gefaechert = baueSankey(beispielBudget(), { hoehe: 900, aufgefaechert: true });
    for (const eltern of gefaechert.knoten.filter((k) => k.art === 'ausgabe')) {
      const kinder = gefaechert.fluesse.filter((f) => f.von === eltern.id);
      if (kinder.length === 0) continue;
      // Am Elternknoten bleibt die Summe der Abgänge gleich seiner Höhe.
      const summeKinder = kinder.reduce((s, f) => s + f.wert, 0);
      expect(summeKinder).toBeCloseTo(eltern.wert, 2);
    }
  });

  it('ändert ohne Unterposten nichts am Auffächern', () => {
    const ohne = budget();
    expect(baueSankey(ohne, { aufgefaechert: true }).knoten.map((k) => k.y0))
      .toEqual(baueSankey(ohne, { aufgefaechert: false }).knoten.map((k) => k.y0));
  });

  it('passt sich anderen Maßen an', () => {
    const schmal = baueSankey(beispielBudget(), { breite: 640, hoehe: 320 });
    for (const k of schmal.knoten) {
      expect(k.x1).toBeLessThanOrEqual(640.001);
      expect(k.y1).toBeLessThanOrEqual(320.001);
    }
  });

  it('beschriftet Kategorien links, also auf ihrem eigenen Zufluss', () => {
    // Rechts vom Knoten lägen die Bänder zu den Unterposten — dort gehört
    // der Name der Kategorie nicht hin.
    for (const k of layout.knoten.filter((n) => n.spalte === 2)) {
      expect(k.labelSeite, k.name).toBe('links');
    }
    for (const k of layout.knoten.filter((n) => n.spalte === 3)) {
      expect(k.labelSeite, k.name).toBe('rechts');
    }
    expect(layout.knoten.find((n) => n.art === 'gesamt')?.labelSeite).toBe('oben');
  });

  it('bleibt bei einer einzigen Einnahme und einer Ausgabe stabil', () => {
    const l = baueSankey({
      einnahmen: [{ id: 'e', name: 'Gehalt', betrag: 100 }],
      ausgaben: [{ id: 'a', name: 'Alles', betrag: 100, unterposten: [] }],
    });
    expect(l.leer).toBe(false);
    expect(l.fluesse).toHaveLength(2);
  });
});
