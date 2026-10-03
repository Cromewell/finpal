import { describe, expect, it } from 'vitest';
import { berechneTeilzeit, entgeltpunkte } from '../teilzeit';
import { defaultPayrollInput, type PayrollInput } from '../payroll';
import { RENTE, SV } from '../constants';

const basis = (patch: Partial<PayrollInput> = {}): PayrollInput => ({
  ...defaultPayrollInput(),
  ...patch,
});

describe('Entgeltpunkte', () => {
  it('ergibt beim Durchschnittsentgelt genau einen Punkt', () => {
    expect(entgeltpunkte(RENTE.durchschnittsentgelt)).toBeCloseTo(1, 10);
  });

  it('wird durch die Beitragsbemessungsgrenze gedeckelt', () => {
    expect(entgeltpunkte(500_000)).toBeCloseTo(SV.bbgRvAvJahr / RENTE.durchschnittsentgelt, 10);
  });
});

describe('Teilzeit-Rechner', () => {
  const ergebnis = berechneTeilzeit({
    basis: basis({ bruttoMonat: 4000 }),
    stundenIst: 40,
    stundenZiel: 32,
  });

  it('skaliert das Brutto linear mit den Stunden', () => {
    expect(ergebnis.ziel.brutto.monat).toBeCloseTo(4000 * (32 / 40), 2);
  });

  it('hält den Stundenlohn konstant', () => {
    expect(ergebnis.stundenlohnBrutto).toBeCloseTo(4000 / (40 * (52 / 12)), 2);
  });

  it('lässt das Netto schwächer sinken als das Brutto', () => {
    expect(ergebnis.nettoVerlustMonat).toBeGreaterThan(0);
    expect(ergebnis.nettoVerlustMonat).toBeLessThan(ergebnis.bruttoVerlustMonat);
    expect(ergebnis.grenzbelastung).toBeGreaterThan(0.4);
    expect(ergebnis.grenzbelastung).toBeLessThan(1);
  });

  it('steigert das Netto pro Wochenstunde bei Reduktion', () => {
    expect(ergebnis.nettoProWochenstundeZiel).toBeGreaterThan(ergebnis.nettoProWochenstundeIst);
  });

  it('rechnet die Kosten je aufgegebener Wochenstunde aus', () => {
    expect(ergebnis.stundenDifferenz).toBe(8);
    expect(ergebnis.kostenProWochenstundeMonat).toBeCloseTo(ergebnis.nettoVerlustMonat / 8, 2);
  });

  it('weist den Verlust an Rentenanwartschaft aus', () => {
    expect(ergebnis.entgeltpunkteZiel).toBeLessThan(ergebnis.entgeltpunkteIst);
    expect(ergebnis.rentenverlustProJahrTeilzeit).toBeGreaterThan(0);
    expect(ergebnis.rentenverlustProJahrTeilzeit).toBeCloseTo(
      (ergebnis.entgeltpunkteIst - ergebnis.entgeltpunkteZiel) * RENTE.rentenwert, 2,
    );
  });

  it('liefert einen monoton steigenden Verlauf samt Zielpunkt', () => {
    const stunden = ergebnis.verlauf.map((p) => p.stunden);
    expect(stunden).toContain(32);
    expect(stunden).toContain(40);
    expect([...stunden].sort((a, b) => a - b)).toEqual(stunden);
    for (let i = 1; i < ergebnis.verlauf.length; i++) {
      expect(ergebnis.verlauf[i]!.nettoMonat).toBeGreaterThanOrEqual(ergebnis.verlauf[i - 1]!.nettoMonat);
    }
  });

  it('erklärt den Effekt in Worten', () => {
    expect(ergebnis.hinweise.join(' ')).toMatch(/trägt der Staat/);
  });

  it('bleibt bei unveränderten Stunden bei null', () => {
    const gleich = berechneTeilzeit({ basis: basis(), stundenIst: 40, stundenZiel: 40 });
    expect(gleich.nettoVerlustMonat).toBe(0);
    expect(gleich.bruttoVerlustMonat).toBe(0);
    expect(gleich.kostenProWochenstundeMonat).toBe(0);
  });

  it('rechnet auch eine Aufstockung', () => {
    const mehr = berechneTeilzeit({ basis: basis({ bruttoMonat: 2000 }), stundenIst: 20, stundenZiel: 30 });
    expect(mehr.nettoVerlustMonat).toBeLessThan(0);
    expect(mehr.hinweise.join(' ')).toMatch(/Aufstockung/);
  });

  it('erkennt den Sprung in den Übergangsbereich', () => {
    const stark = berechneTeilzeit({ basis: basis({ bruttoMonat: 4000 }), stundenIst: 40, stundenZiel: 15 });
    expect(stark.ziel.sv.modus).toBe('uebergangsbereich');
    expect(stark.hinweise.join(' ')).toMatch(/Übergangsbereich/);
  });

  it('warnt beim Abrutschen in die Minijob-Zone', () => {
    const mini = berechneTeilzeit({ basis: basis({ bruttoMonat: 4000 }), stundenIst: 40, stundenZiel: 5 });
    expect(mini.ziel.sv.modus).toBe('minijob');
    expect(mini.hinweise.join(' ')).toMatch(/Minijob/);
  });

  it('kommt mit unsinnigen Ausgangsstunden klar', () => {
    const r = berechneTeilzeit({ basis: basis(), stundenIst: 0, stundenZiel: 20 });
    expect(Number.isFinite(r.nettoVerlustMonat)).toBe(true);
  });

  it('kostet eine Reduktion netto über alle Einkommen hinweg etwa die Hälfte', () => {
    for (const bruttoMonat of [2600, 3200, 4000, 5000, 6500, 8000, 9000, 12_000, 20_000]) {
      const r = berechneTeilzeit({ basis: basis({ bruttoMonat }), stundenIst: 40, stundenZiel: 32 });
      expect(r.grenzbelastung, `Brutto ${bruttoMonat}`).toBeGreaterThan(0.45);
      expect(r.grenzbelastung, `Brutto ${bruttoMonat}`).toBeLessThan(0.7);
    }
  });

  it('bringt oberhalb der Beitragsbemessungsgrenze keine Entlastung bei den Beiträgen', () => {
    // 9 000 € und 7 200 € liegen beide über der Grenze für Kranken- und
    // Pflegeversicherung — dort spart die Reduktion keinen Cent Beitrag.
    const hoch = berechneTeilzeit({ basis: basis({ bruttoMonat: 9000 }), stundenIst: 40, stundenZiel: 32 });
    expect(hoch.ziel.sv.an.kv).toBeCloseTo(hoch.ist.sv.an.kv, 2);
    expect(hoch.ziel.sv.an.pv).toBeCloseTo(hoch.ist.sv.an.pv, 2);
    // Im Regelfall unterhalb der Grenze sinken die Beiträge dagegen mit.
    const mittel = berechneTeilzeit({ basis: basis({ bruttoMonat: 4000 }), stundenIst: 40, stundenZiel: 32 });
    expect(mittel.ziel.sv.an.kv).toBeLessThan(mittel.ist.sv.an.kv);
  });
});

describe('Entgeltpunkte in Sonderlagen', () => {
  it('zählt im Minijob mit Befreiung nur anteilig', () => {
    const voll = entgeltpunkte(7200, { rvPflicht: true, minijob: false, minijobRvBefreiung: true });
    const befreit = entgeltpunkte(7200, { rvPflicht: true, minijob: true, minijobRvBefreiung: true });
    expect(befreit).toBeCloseTo(voll * (0.15 / SV.rvGesamt), 8);
  });

  it('zählt im Minijob ohne Befreiung voll', () => {
    expect(entgeltpunkte(7200, { rvPflicht: true, minijob: true, minijobRvBefreiung: false }))
      .toBeCloseTo(7200 / RENTE.durchschnittsentgelt, 8);
  });

  it('ergibt ohne Rentenversicherungspflicht null Punkte', () => {
    expect(entgeltpunkte(60_000, { rvPflicht: false, minijob: false, minijobRvBefreiung: false })).toBe(0);
  });

  it('senkt den ausgewiesenen Rentenverlust beim Abrutschen in den Minijob', () => {
    const mini = berechneTeilzeit({ basis: basis({ bruttoMonat: 4000 }), stundenIst: 40, stundenZiel: 5 });
    expect(mini.ziel.sv.modus).toBe('minijob');
    // Mit Befreiung bleibt nur der Anteil aus dem 15-%-Pauschalbeitrag.
    expect(mini.entgeltpunkteZiel).toBeLessThan((5 / 40) * mini.entgeltpunkteIst);
    expect(mini.entgeltpunkteZiel).toBeGreaterThan(0);
  });
});
