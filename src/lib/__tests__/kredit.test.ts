import { describe, expect, it } from 'vitest';
import {
  annuitaet, berechneKredit, defaultKreditEingabe, effektivzins, tilgungFuerLaufzeit,
  type KreditEingabe,
} from '../kredit';

const kredit = (teil: Partial<KreditEingabe> = {}): KreditEingabe => ({
  ...defaultKreditEingabe(), ...teil,
});

describe('Annuität', () => {
  it('ergibt sich aus Zins plus Tilgung auf das Darlehen', () => {
    // 300.000 € zu 3 % Zins und 2 % Tilgung → 5 % im Jahr → 1.250 € im Monat
    expect(annuitaet(300_000, 3, 2)).toBe(1250);
  });

  it('rechnet den effektiven Jahreszins aus der monatlichen Verzinsung', () => {
    expect(effektivzins(3.6)).toBeCloseTo((1 + 0.036 / 12) ** 12 - 1, 10);
    expect(effektivzins(3.6)).toBeGreaterThan(0.036);
  });
});

describe('Tilgungsplan', () => {
  const r = berechneKredit(kredit({
    darlehen: 300_000, sollzins: 3, anfangstilgung: 2, zinsbindung: 10, sondertilgung: 0,
    anschlusszins: 3,
  }));

  it('setzt die Rate aus Zins und Tilgung zusammen', () => {
    expect(r.monatsrate).toBe(1250);
    expect(r.anfangstilgung).toBeCloseTo(2, 2);
  });

  it('tilgt das Darlehen vollständig', () => {
    expect(r.laufzeitMonate).not.toBeNull();
    expect(r.jahre[r.jahre.length - 1]!.restschuldEnde).toBeLessThan(0.01);
  });

  it('bleibt in sich schlüssig: Tilgung plus Restschuld ergibt das Darlehen', () => {
    const getilgt = r.jahre.reduce((s, j) => s + j.tilgung + j.sondertilgung, 0);
    expect(getilgt).toBeCloseTo(300_000, 0);
  });

  it('zahlt insgesamt Darlehen plus Zinsen', () => {
    expect(r.zahlungenGesamt).toBeCloseTo(300_000 + r.zinsenGesamt, 0);
  });

  it('lässt den Zinsanteil über die Jahre fallen und die Tilgung steigen', () => {
    for (let i = 1; i < Math.min(10, r.jahre.length); i++) {
      expect(r.jahre[i]!.zins).toBeLessThan(r.jahre[i - 1]!.zins);
      expect(r.jahre[i]!.tilgung).toBeGreaterThan(r.jahre[i - 1]!.tilgung);
    }
  });

  it('lässt die Restschuld streng fallen', () => {
    for (let i = 1; i < r.jahre.length; i++) {
      expect(r.jahre[i]!.restschuldEnde).toBeLessThan(r.jahre[i - 1]!.restschuldEnde);
    }
  });

  it('weist nach zehn Jahren erst einen kleinen Teil als getilgt aus', () => {
    // Der viel unterschätzte Punkt: Bei 2 % Anfangstilgung bleibt nach der
    // üblichen Zinsbindung der weit überwiegende Teil der Schuld stehen.
    expect(r.getilgtBisBindung).toBeGreaterThan(0.2);
    expect(r.getilgtBisBindung).toBeLessThan(0.3);
    expect(r.restschuldNachBindung).toBeCloseTo(300_000 * (1 - r.getilgtBisBindung), 0);
  });

  it('warnt vor der Restschuld am Ende der Zinsbindung', () => {
    expect(r.hinweise.join(' ')).toMatch(/Restschuld/);
    expect(r.hinweise.join(' ')).toMatch(/Anschlusszins/);
  });
});

describe('Zinsbindung und Anschlusszins', () => {
  it('rechnet nach der Bindung mit dem neuen Zins weiter', () => {
    const guenstig = berechneKredit(kredit({ anschlusszins: 2 }));
    const teuer = berechneKredit(kredit({ anschlusszins: 5 }));
    expect(teuer.laufzeitMonate!).toBeGreaterThan(guenstig.laufzeitMonate!);
    expect(teuer.zinsenGesamt).toBeGreaterThan(guenstig.zinsenGesamt);
    // Bis zum Ende der Bindung sind beide identisch.
    expect(teuer.restschuldNachBindung).toBeCloseTo(guenstig.restschuldNachBindung, 2);
    expect(teuer.zinsenBisBindung).toBeCloseTo(guenstig.zinsenBisBindung, 2);
  });

  it('erkennt, wenn ein hoher Anschlusszins die Tilgung auffrisst', () => {
    // 350.000 € zu 3,6 % mit 2 % Tilgung: Nach zehn Jahren stehen noch rund
    // 263.000 € offen. Zu 7 % sind davon allein die Zinsen fast so hoch wie
    // die ganze Rate — die Schuld sinkt dann kaum noch.
    const r = berechneKredit(kredit({ anschlusszins: 7 }));
    expect(r.laufzeitMonate).toBeNull();
    expect(r.hinweise.join(' ')).toMatch(/Anschlusszins/);
    expect(r.hinweise.join(' ')).toMatch(/Rate erhöhen/);
    // Die Rate deckt die Zinsen aber durchaus — es ist kein Abbruchfall.
    expect(r.hinweise.join(' ')).not.toMatch(/deckt nicht einmal die Zinsen/);
  });

  it('kennzeichnet die Jahre innerhalb der Zinsbindung', () => {
    const r = berechneKredit(kredit({ zinsbindung: 10 }));
    expect(r.jahre.filter((j) => j.inZinsbindung)).toHaveLength(10);
  });
});

describe('Sondertilgung', () => {
  it('verkürzt die Laufzeit und senkt die Zinsen', () => {
    const ohne = berechneKredit(kredit({ sondertilgung: 0 }));
    const mit = berechneKredit(kredit({ sondertilgung: 6_000 }));
    expect(mit.laufzeitMonate!).toBeLessThan(ohne.laufzeitMonate!);
    expect(mit.zinsenGesamt).toBeLessThan(ohne.zinsenGesamt);
    expect(mit.summeSondertilgung).toBeGreaterThan(0);
    expect(mit.hinweise.join(' ')).toMatch(/Sondertilgung verkürzt/);
  });

  it('tilgt nie mehr als die Restschuld', () => {
    const r = berechneKredit(kredit({ darlehen: 20_000, sondertilgung: 50_000 }));
    expect(r.jahre.every((j) => j.restschuldEnde >= -0.01)).toBe(true);
    expect(r.summeSondertilgung).toBeLessThanOrEqual(20_000);
  });
});

describe('Vorgegebene Rate', () => {
  it('rechnet die anfängliche Tilgung aus der Rate zurück', () => {
    const r = berechneKredit(kredit({
      darlehen: 300_000, sollzins: 3, tilgungsart: 'rate', rate: 1250,
    }));
    expect(r.anfangstilgung).toBeCloseTo(2, 2);
  });

  it('erkennt eine Rate, die nicht einmal die Zinsen deckt', () => {
    const r = berechneKredit(kredit({
      darlehen: 300_000, sollzins: 4, tilgungsart: 'rate', rate: 500,
    }));
    expect(r.laufzeitMonate).toBeNull();
    expect(r.hinweise.join(' ')).toMatch(/deckt nicht einmal die Zinsen/);
  });
});

describe('Randfälle', () => {
  it('kommt mit einem Darlehen von null zurecht', () => {
    const r = berechneKredit(kredit({ darlehen: 0 }));
    expect(r.jahre).toHaveLength(0);
    expect(r.zinsenGesamt).toBe(0);
  });

  it('tilgt bei null Prozent Zins linear', () => {
    const r = berechneKredit(kredit({
      darlehen: 120_000, sollzins: 0, tilgungsart: 'rate', rate: 1_000,
      zinsbindung: 0, anschlusszins: 0, sondertilgung: 0,
    }));
    expect(r.zinsenGesamt).toBe(0);
    expect(r.laufzeitMonate).toBe(120);
  });

  it('nennt die Tilgung für eine gewünschte Laufzeit', () => {
    const tilgung = tilgungFuerLaufzeit(300_000, 3, 20);
    const r = berechneKredit(kredit({
      darlehen: 300_000, sollzins: 3, anfangstilgung: tilgung,
      zinsbindung: 30, anschlusszins: 3, sondertilgung: 0,
    }));
    expect(r.laufzeitMonate! / 12).toBeCloseTo(20, 0);
  });
});
