import { describe, expect, it } from 'vitest';
import { eurDelta, parseDezimal, prozent, zumBearbeiten } from '../format';

describe('parseDezimal', () => {
  it('liest deutsche Dezimalkommas', () => {
    expect(parseDezimal('32,5')).toBe(32.5);
    expect(parseDezimal('2500,50')).toBe(2500.5);
    expect(parseDezimal('0,912')).toBe(0.912);
  });

  it('liest auch die englische Schreibweise', () => {
    expect(parseDezimal('32.5')).toBe(32.5);
    expect(parseDezimal('4000')).toBe(4000);
  });

  it('erkennt Tausendertrenner in beiden Schreibweisen', () => {
    expect(parseDezimal('1.234,50')).toBe(1234.5);
    expect(parseDezimal('1,234.50')).toBe(1234.5);
    expect(parseDezimal('48.000')).toBe(48); // Punkt allein gilt als Dezimaltrenner
  });

  it('übergeht Leerzeichen und Einheiten', () => {
    expect(parseDezimal(' 4 000 ')).toBe(4000);
    expect(parseDezimal('2500,50 €')).toBe(2500.5);
    expect(parseDezimal('2,9 %')).toBe(2.9);
  });

  it('gibt bei unfertigen Eingaben null zurück statt einer Null', () => {
    // Genau hier lag der Fehler: Ein leeres Feld wurde zu 0 und schob dem
    // Nutzer eine Ziffer vor den nächsten Tastendruck.
    expect(parseDezimal('')).toBeNull();
    expect(parseDezimal('  ')).toBeNull();
    expect(parseDezimal('-')).toBeNull();
    expect(parseDezimal(',')).toBeNull();
  });

  it('weist Unsinn zurück', () => {
    expect(parseDezimal('abc')).toBeNull();
    expect(parseDezimal('4e5')).toBeNull();
    expect(parseDezimal('1.2.3.4,5,6')).toBeNull();
  });

  it('erlaubt Zwischenstände beim Tippen', () => {
    expect(parseDezimal('3')).toBe(3);
    expect(parseDezimal('32,')).toBe(32);
    expect(parseDezimal('0,')).toBe(0);
  });

  it('kehrt die Bearbeitungsdarstellung wieder um', () => {
    for (const wert of [0, 0.5, 32.5, 4000, 2500.5, 0.912]) {
      expect(parseDezimal(zumBearbeiten(wert))).toBe(wert);
    }
  });

  it('stellt Werte ohne Tausenderpunkte zum Weitertippen dar', () => {
    expect(zumBearbeiten(4000)).toBe('4000');
    expect(zumBearbeiten(32.5)).toBe('32,5');
  });
});

describe('Formate', () => {
  // Intl setzt vor die Einheit ein geschütztes Leerzeichen; für den Vergleich
  // wird jede Art von Leerraum vereinheitlicht.
  const schlicht = (text: string) => text.replace(/\s/g, ' ');

  it('setzt bei Veränderungen ein Vorzeichen', () => {
    expect(schlicht(eurDelta(-800))).toBe('−800,00 €');
    expect(schlicht(eurDelta(800))).toBe('+800,00 €');
    expect(schlicht(eurDelta(0))).toBe('0,00 €');
  });

  it('gibt Prozentsätze deutsch aus', () => {
    expect(schlicht(prozent(0.349))).toBe('34,9 %');
    expect(schlicht(prozent(0.0875, 2))).toBe('8,75 %');
  });
});
