import { describe, expect, it } from 'vitest';
import { SV } from '../constants';
import {
  berechneSozialversicherung, pflegeSatzArbeitnehmer,
  uebergangsbereichAnEntgelt, uebergangsbereichGesamtEntgelt,
  type SvInput,
} from '../sozialversicherung';

const basis: SvInput = {
  bruttoMonat: 4000,
  bundesland: 'NW',
  kvTyp: 'gesetzlich',
  zusatzbeitrag: 2.9,
  pkvKrankenMonat: 0,
  pkvPflegeMonat: 0,
  rvPflicht: true,
  avPflicht: true,
  kinderlos: true,
  pvAbschlaege: 0,
  minijobRvBefreiung: true,
};

describe('Pflegeversicherung', () => {
  it('rechnet außerhalb Sachsens mit 1,8 % Arbeitnehmeranteil', () => {
    expect(pflegeSatzArbeitnehmer('NW', false, 0)).toBeCloseTo(0.018, 10);
  });

  it('erhöht den Satz für Kinderlose um 0,6 Punkte', () => {
    expect(pflegeSatzArbeitnehmer('NW', true, 0)).toBeCloseTo(0.024, 10);
  });

  it('verlangt in Sachsen 2,3 % vom Arbeitnehmer', () => {
    expect(pflegeSatzArbeitnehmer('SN', false, 0)).toBeCloseTo(0.023, 10);
    expect(pflegeSatzArbeitnehmer('SN', true, 0)).toBeCloseTo(0.029, 10);
  });

  it('senkt den Satz ab dem zweiten Kind um je 0,25 Punkte', () => {
    expect(pflegeSatzArbeitnehmer('NW', false, 1)).toBeCloseTo(0.0155, 10);
    expect(pflegeSatzArbeitnehmer('NW', false, 4)).toBeCloseTo(0.008, 10);
  });

  it('gewährt Kinderlosen keine Abschläge', () => {
    expect(pflegeSatzArbeitnehmer('NW', true, 4)).toBeCloseTo(0.024, 10);
  });

  it('verteilt den Gesamtbeitrag in Sachsen anders, aber vollständig', () => {
    const sachsen = berechneSozialversicherung({ ...basis, bundesland: 'SN', kinderlos: false });
    const nrw = berechneSozialversicherung({ ...basis, bundesland: 'NW', kinderlos: false });
    expect(sachsen.an.pv + sachsen.ag.pv).toBeCloseTo(nrw.an.pv + nrw.ag.pv, 2);
    expect(sachsen.an.pv).toBeGreaterThan(nrw.an.pv);
  });
});

describe('Beitragsbemessungsgrenzen', () => {
  it('begrenzt Kranken- und Pflegebeiträge auf 5 812,50 € im Monat', () => {
    const hoch = berechneSozialversicherung({ ...basis, bruttoMonat: 20_000 });
    expect(hoch.bemessung.kvPv).toBeCloseTo(SV.bbgKvPvJahr / 12, 2);
    expect(hoch.an.kv).toBeCloseTo((SV.bbgKvPvJahr / 12) * ((0.146 + 0.029) / 2), 2);
  });

  it('begrenzt Renten- und Arbeitslosenbeiträge auf 8 450 € im Monat', () => {
    const hoch = berechneSozialversicherung({ ...basis, bruttoMonat: 20_000 });
    expect(hoch.bemessung.rvAv).toBeCloseTo(SV.bbgRvAvJahr / 12, 2);
    expect(hoch.an.rv).toBeCloseTo((SV.bbgRvAvJahr / 12) * 0.093, 2);
  });

  it('meldet erreichte Grenzen', () => {
    expect(berechneSozialversicherung({ ...basis, bruttoMonat: 20_000 }).bbgErreicht).toEqual({
      kvPv: true, rvAv: true,
    });
    expect(berechneSozialversicherung(basis).bbgErreicht).toEqual({ kvPv: false, rvAv: false });
  });
});

describe('Übergangsbereich (Midijob)', () => {
  it('setzt die Arbeitnehmer-Bemessungsgrundlage an der Untergrenze auf null', () => {
    expect(uebergangsbereichAnEntgelt(SV.minijobGrenze)).toBeCloseTo(0, 8);
  });

  it('erreicht an der Obergrenze das volle Entgelt', () => {
    const og = SV.uebergangsbereichObergrenze;
    expect(uebergangsbereichAnEntgelt(og)).toBeCloseTo(og, 6);
    expect(uebergangsbereichGesamtEntgelt(og)).toBeCloseTo(og, 6);
  });

  it('entspricht an der Untergrenze dem Minijob-Pauschalbeitrag von 28 %', () => {
    const gesamt = uebergangsbereichGesamtEntgelt(SV.minijobGrenze);
    const gesamtsatz = SV.kvAllgemein + 0.029 + SV.pvGesamt + SV.rvGesamt + SV.avGesamt;
    expect(gesamt * gesamtsatz).toBeCloseTo(SV.minijobGrenze * SV.minijobPauschaleAg, 1);
  });

  it('lässt den Arbeitnehmeranteil knapp über der Grenze fast verschwinden', () => {
    const knapp = berechneSozialversicherung({ ...basis, bruttoMonat: 610 });
    expect(knapp.modus).toBe('uebergangsbereich');
    expect(knapp.an.summe).toBeLessThan(3);
    expect(knapp.ag.summe).toBeGreaterThan(knapp.an.summe * 10);
  });

  it('geht an der Obergrenze stufenlos in den Regelfall über', () => {
    const innen = berechneSozialversicherung({ ...basis, bruttoMonat: 2000 });
    const ausserhalb = berechneSozialversicherung({ ...basis, bruttoMonat: 2000.01 });
    expect(innen.modus).toBe('uebergangsbereich');
    expect(ausserhalb.modus).toBe('regulaer');
    expect(Math.abs(innen.an.summe - ausserhalb.an.summe)).toBeLessThan(0.05);
  });

  it('trägt den Gesamtbeitrag vollständig auf beide Schultern', () => {
    const mitte = berechneSozialversicherung({ ...basis, bruttoMonat: 1300 });
    const gesamtsatz = SV.kvAllgemein + 0.029 + SV.pvGesamt + SV.rvGesamt + SV.avGesamt;
    const soll = uebergangsbereichGesamtEntgelt(1300) * gesamtsatz;
    expect(mitte.an.summe + mitte.ag.summe).toBeCloseTo(soll, 1);
  });
});

describe('Minijob', () => {
  it('belastet den Arbeitnehmer bei Befreiung nicht', () => {
    const mini = berechneSozialversicherung({ ...basis, bruttoMonat: 550 });
    expect(mini.modus).toBe('minijob');
    expect(mini.an.summe).toBe(0);
  });

  it('zieht ohne Befreiung 3,6 % für die Rentenversicherung ab', () => {
    const mini = berechneSozialversicherung({ ...basis, bruttoMonat: 550, minijobRvBefreiung: false });
    expect(mini.an.rv).toBeCloseTo(550 * 0.036, 2);
  });

  it('kostet den Arbeitgeber die Pauschale von 28 %', () => {
    const mini = berechneSozialversicherung({ ...basis, bruttoMonat: 600 });
    expect(mini.ag.summe).toBeCloseTo(600 * 0.28, 2);
  });
});

describe('private Krankenversicherung', () => {
  it('begrenzt den Arbeitgeberzuschuss auf den halben Höchstbeitrag der GKV', () => {
    const pkv = berechneSozialversicherung({
      ...basis, bruttoMonat: 9000, kvTyp: 'privat',
      pkvKrankenMonat: 1200, pkvPflegeMonat: 300,
    });
    const maxKv = (SV.bbgKvPvJahr / 12) * ((0.146 + 0.029) / 2);
    const maxPv = (SV.bbgKvPvJahr / 12) * 0.018;
    expect(pkv.pkvZuschuss).toBeCloseTo(maxKv + maxPv, 2);
    expect(pkv.an.kv).toBe(0);
    expect(pkv.an.pv).toBe(0);
  });

  it('übernimmt bei günstigen Tarifen genau die Hälfte', () => {
    const pkv = berechneSozialversicherung({
      ...basis, bruttoMonat: 7000, kvTyp: 'privat',
      pkvKrankenMonat: 400, pkvPflegeMonat: 60,
    });
    expect(pkv.pkvZuschuss).toBeCloseTo(230, 2);
    expect(pkv.pkvEigenanteil).toBeCloseTo(230, 2);
  });
});

describe('Versicherungsfreiheit', () => {
  it('lässt Renten- und Arbeitslosenbeiträge entfallen, wenn keine Pflicht besteht', () => {
    const frei = berechneSozialversicherung({ ...basis, rvPflicht: false, avPflicht: false });
    expect(frei.an.rv).toBe(0);
    expect(frei.an.av).toBe(0);
    expect(frei.an.kv).toBeGreaterThan(0);
  });
});
