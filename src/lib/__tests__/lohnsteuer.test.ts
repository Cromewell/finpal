/**
 * Prüft den generierten amtlichen Rechenkern gegen Testvektoren, die gegen die
 * offizielle BMF-Schnittstelle (bmf-steuerrechner.de) abgeglichen wurden.
 * Quelle der Vektoren: github.com/canida-software/lohnsteuer (MIT).
 */
import { describe, expect, it } from 'vitest';
import Lohnsteuer2026 from '../lohnsteuer2026.generated.js';
import BigDecimal from '../bigdecimal';
import fixtures from './bmf-2026.fixtures.json';

type Eingabefeld = keyof typeof SETZER;

/** Ordnet jedem PAP-Eingabefeld seinen typisierten Setter zu. */
const SETZER = {
  af: (r: Lohnsteuer2026, w: number) => r.setAf(w),
  AJAHR: (r: Lohnsteuer2026, w: number) => r.setAjahr(w),
  ALTER1: (r: Lohnsteuer2026, w: number) => r.setAlter1(w),
  ALV: (r: Lohnsteuer2026, w: number) => r.setAlv(w),
  KRV: (r: Lohnsteuer2026, w: number) => r.setKrv(w),
  LZZ: (r: Lohnsteuer2026, w: number) => r.setLzz(w),
  PKV: (r: Lohnsteuer2026, w: number) => r.setPkv(w),
  PVS: (r: Lohnsteuer2026, w: number) => r.setPvs(w),
  PVZ: (r: Lohnsteuer2026, w: number) => r.setPvz(w),
  R: (r: Lohnsteuer2026, w: number) => r.setR(w),
  STKL: (r: Lohnsteuer2026, w: number) => r.setStkl(w),
  VJAHR: (r: Lohnsteuer2026, w: number) => r.setVjahr(w),
  ZMVB: (r: Lohnsteuer2026, w: number) => r.setZmvb(w),
  f: (r: Lohnsteuer2026, w: number) => r.setF(w),
  JFREIB: (r: Lohnsteuer2026, w: number) => r.setJfreib(BigDecimal.valueOf(w)),
  JHINZU: (r: Lohnsteuer2026, w: number) => r.setJhinzu(BigDecimal.valueOf(w)),
  JRE4: (r: Lohnsteuer2026, w: number) => r.setJre4(BigDecimal.valueOf(w)),
  JRE4ENT: (r: Lohnsteuer2026, w: number) => r.setJre4ent(BigDecimal.valueOf(w)),
  JVBEZ: (r: Lohnsteuer2026, w: number) => r.setJvbez(BigDecimal.valueOf(w)),
  KVZ: (r: Lohnsteuer2026, w: number) => r.setKvz(BigDecimal.valueOf(w)),
  LZZFREIB: (r: Lohnsteuer2026, w: number) => r.setLzzfreib(BigDecimal.valueOf(w)),
  LZZHINZU: (r: Lohnsteuer2026, w: number) => r.setLzzhinzu(BigDecimal.valueOf(w)),
  MBV: (r: Lohnsteuer2026, w: number) => r.setMbv(BigDecimal.valueOf(w)),
  PKPV: (r: Lohnsteuer2026, w: number) => r.setPkpv(BigDecimal.valueOf(w)),
  PKPVAGZ: (r: Lohnsteuer2026, w: number) => r.setPkpvagz(BigDecimal.valueOf(w)),
  PVA: (r: Lohnsteuer2026, w: number) => r.setPva(BigDecimal.valueOf(w)),
  RE4: (r: Lohnsteuer2026, w: number) => r.setRe4(BigDecimal.valueOf(w)),
  SONSTB: (r: Lohnsteuer2026, w: number) => r.setSonstb(BigDecimal.valueOf(w)),
  SONSTENT: (r: Lohnsteuer2026, w: number) => r.setSonstent(BigDecimal.valueOf(w)),
  STERBE: (r: Lohnsteuer2026, w: number) => r.setSterbe(BigDecimal.valueOf(w)),
  VBEZ: (r: Lohnsteuer2026, w: number) => r.setVbez(BigDecimal.valueOf(w)),
  VBEZM: (r: Lohnsteuer2026, w: number) => r.setVbezm(BigDecimal.valueOf(w)),
  VBEZS: (r: Lohnsteuer2026, w: number) => r.setVbezs(BigDecimal.valueOf(w)),
  VBS: (r: Lohnsteuer2026, w: number) => r.setVbs(BigDecimal.valueOf(w)),
  ZKF: (r: Lohnsteuer2026, w: number) => r.setZkf(BigDecimal.valueOf(w)),
} as const;

/** Ausgaben, die die Testvektoren abdecken. */
const LESER = {
  LSTLZZ: (r: Lohnsteuer2026) => r.getLstlzz(),
  SOLZLZZ: (r: Lohnsteuer2026) => r.getSolzlzz(),
  BK: (r: Lohnsteuer2026) => r.getBk(),
  BKS: (r: Lohnsteuer2026) => r.getBks(),
  SOLZS: (r: Lohnsteuer2026) => r.getSolzs(),
  STS: (r: Lohnsteuer2026) => r.getSts(),
  VFRB: (r: Lohnsteuer2026) => r.getVfrb(),
  VFRBS1: (r: Lohnsteuer2026) => r.getVfrbs1(),
  VFRBS2: (r: Lohnsteuer2026) => r.getVfrbs2(),
  WVFRB: (r: Lohnsteuer2026) => r.getWvfrb(),
  WVFRBM: (r: Lohnsteuer2026) => r.getWvfrbm(),
  WVFRBO: (r: Lohnsteuer2026) => r.getWvfrbo(),
} as const;

interface Fixture {
  inputs: Record<string, number>;
  expected: Record<string, number>;
}

function rechne(inputs: Record<string, number>): Record<string, number> {
  const rechner = new Lohnsteuer2026({});
  for (const [feld, wert] of Object.entries(inputs)) {
    const setzer = SETZER[feld as Eingabefeld];
    expect(setzer, `Unbekanntes PAP-Eingabefeld: ${feld}`).toBeTypeOf('function');
    setzer(rechner, wert);
  }
  rechner.MAIN();

  const ausgabe: Record<string, number> = {};
  for (const [feld, lies] of Object.entries(LESER)) {
    ausgabe[feld] = lies(rechner).longValue();
  }
  return ausgabe;
}

describe('amtlicher Lohnsteuer-Rechenkern 2026', () => {
  const vektoren = fixtures as unknown as Fixture[];

  it('enthält eine aussagekräftige Zahl an Testvektoren', () => {
    expect(vektoren.length).toBeGreaterThan(200);
  });

  it.each(vektoren.map((f, i) => [i, f] as const))(
    'Vektor %i stimmt centgenau mit der BMF-Schnittstelle überein',
    (_i, fixture) => {
      const ergebnis = rechne(fixture.inputs);
      for (const [feld, erwartet] of Object.entries(fixture.expected)) {
        if (!(feld in ergebnis)) continue;
        expect(ergebnis[feld], `${feld} für ${JSON.stringify(fixture.inputs)}`).toBe(erwartet);
      }
    },
  );

  it('setzt den Tarif 2026 um: Grundfreibetrag bleibt steuerfrei', () => {
    // 12 348 € Jahreslohn liegt nach Pauschbeträgen klar unter dem Grundfreibetrag.
    expect(rechne({ LZZ: 1, RE4: 1_234_800, STKL: 1 }).LSTLZZ).toBe(0);
  });

  it('belastet Steuerklasse V deutlich stärker als Steuerklasse III', () => {
    const basis = { LZZ: 2, RE4: 350_000, KVZ: 2.9 };
    const drei = rechne({ ...basis, STKL: 3 }).LSTLZZ!;
    const fuenf = rechne({ ...basis, STKL: 5 }).LSTLZZ!;
    expect(fuenf).toBeGreaterThan(drei * 3);
  });
});
