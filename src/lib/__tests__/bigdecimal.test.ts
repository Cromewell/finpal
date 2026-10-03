import { describe, expect, it } from 'vitest';
import BigDecimal, { ROUND_DOWN, ROUND_UP } from '../bigdecimal';

const bd = (v: number | string) => BigDecimal.valueOf(v);

describe('BigDecimal', () => {
  it('übernimmt Fließkommazahlen über ihre exakte Dezimaldarstellung', () => {
    expect(bd(0.07).toString()).toBe('0.07');
    expect(bd(2.9).toString()).toBe('2.9');
    expect(bd(0.0025).toString()).toBe('0.0025');
  });

  it('addiert ohne Fließkomma-Fehler', () => {
    expect(bd(0.1).add(bd(0.2)).toString()).toBe('0.3');
    expect(bd(0.07).add(bd(0.018)).add(bd(0.006)).toString()).toBe('0.094');
  });

  it('multipliziert mit exakter Skalierung', () => {
    expect(bd(1.1).multiply(bd(1.1)).toString()).toBe('1.21');
    expect(bd('101400').multiply(bd(0.093)).toString()).toBe('9430.200');
  });

  it('dividiert exakt, wenn das Ergebnis endlich ist', () => {
    expect(bd(1).divide(bd(8)).toString()).toBe('0.125');
    expect(bd(250).divide(bd(100)).toString()).toBe('2.5');
  });

  it('schneidet nicht endliche Divisionen ab, statt zu scheitern', () => {
    const drittel = bd(1).divide(bd(3));
    expect(drittel.toString().startsWith('0.333333')).toBe(true);
  });

  it('rundet bei vorgegebener Skalierung in beide Richtungen', () => {
    expect(bd(1).divide(bd(3), 2, ROUND_DOWN).toString()).toBe('0.33');
    expect(bd(1).divide(bd(3), 2, ROUND_UP).toString()).toBe('0.34');
    expect(bd(-1).divide(bd(3), 2, ROUND_UP).toString()).toBe('-0.34');
    expect(bd(-1).divide(bd(3), 2, ROUND_DOWN).toString()).toBe('-0.33');
  });

  it('setScale schneidet zur Null hin ab und rundet aufwärts von ihr weg', () => {
    expect(bd(12.349).setScale(2, ROUND_DOWN).toString()).toBe('12.34');
    expect(bd(12.341).setScale(2, ROUND_UP).toString()).toBe('12.35');
    expect(bd(-12.341).setScale(2, ROUND_UP).toString()).toBe('-12.35');
    expect(bd(1234.56).setScale(0, ROUND_DOWN).toString()).toBe('1234');
  });

  it('vergleicht unabhängig von nachlaufenden Nullen', () => {
    expect(bd('2.50').compareTo(bd('2.5'))).toBe(0);
    expect(bd('2.50').compareTo(bd('2.51'))).toBe(-1);
    expect(bd('2.52').compareTo(bd('2.51'))).toBe(1);
  });

  it('schneidet bei longValue zur Null hin ab', () => {
    expect(bd(9.99).longValue()).toBe(9);
    expect(bd(-9.99).longValue()).toBe(-9);
  });

  it('verarbeitet Exponentialschreibweise', () => {
    expect(bd('1e3').toString()).toBe('1000');
    expect(bd('1.5e-2').toString()).toBe('0.015');
  });

  it('verweigert Division durch Null', () => {
    expect(() => bd(1).divide(bd(0))).toThrow();
  });
});
