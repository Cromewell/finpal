/**
 * Minimale, exakte BigDecimal-Implementierung auf Basis von BigInt.
 *
 * Der amtliche Programmablaufplan (PAP) des BMF ist in Java mit
 * java.math.BigDecimal formuliert. Der daraus generierte Code benutzt nur einen
 * kleinen Teil dieser API. Diese Datei stellt genau diesen Teil bereit —
 * bit-genau und ohne Fließkomma-Fehler, damit die Lohnsteuer centgenau dem
 * amtlichen Ergebnis entspricht.
 *
 * Bewusst keine externe Abhängigkeit: der Rechenkern soll vollständig
 * auditierbar bleiben.
 */

/** Rundungsmodi mit denselben Zahlwerten wie in java.math.BigDecimal. */
export const ROUND_UP = 0; // von der Null weg
export const ROUND_DOWN = 1; // zur Null hin (abschneiden)

export type RoundingMode = typeof ROUND_UP | typeof ROUND_DOWN;

const TEN = 10n;

function pow10(n: number): bigint {
  return TEN ** BigInt(n);
}

/** Division mit Rundung; `den` muss positiv sein. */
function divRound(num: bigint, den: bigint, mode: RoundingMode): bigint {
  const negative = num < 0n;
  const abs = negative ? -num : num;
  const q = abs / den;
  const rest = abs % den;
  let magnitude = q;
  if (rest !== 0n && mode === ROUND_UP) magnitude = q + 1n;
  return negative ? -magnitude : magnitude;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** Zerlegt eine Dezimalzahl-Zeichenkette in unskalierten Wert und Skalierung. */
function parse(input: string): { unscaled: bigint; scale: number } {
  const text = input.trim();
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!match || (match[2] === '' && (match[3] ?? '') === '')) {
    throw new TypeError(`Keine gültige Dezimalzahl: ${input}`);
  }
  const [, sign, intPart, fracPart = '', expPart] = match;
  const digits = `${intPart}${fracPart}` || '0';
  let scale = fracPart.length;
  let unscaled = BigInt(digits);
  if (sign === '-') unscaled = -unscaled;

  const exponent = expPart ? Number(expPart) : 0;
  scale -= exponent;
  if (scale < 0) {
    unscaled *= pow10(-scale);
    scale = 0;
  }
  return { unscaled, scale };
}

export class BigDecimal {
  /** Unskalierter Wert: der eigentliche Zahlwert ist `unscaled / 10^scale`. */
  readonly unscaled: bigint;
  /** Anzahl der Dezimalstellen, immer >= 0. */
  readonly scale: number;

  constructor(unscaled: bigint, scale: number) {
    if (scale < 0) {
      this.unscaled = unscaled * pow10(-scale);
      this.scale = 0;
    } else {
      this.unscaled = unscaled;
      this.scale = scale;
    }
  }

  static valueOf(value: number | string | bigint | BigDecimal): BigDecimal {
    if (value instanceof BigDecimal) return value;
    if (typeof value === 'bigint') return new BigDecimal(value, 0);
    // Number.prototype.toString liefert die kürzeste exakte Dezimaldarstellung,
    // d.h. valueOf(0.07) ergibt genau 7/100 — wie Java's BigDecimal.valueOf(double).
    const { unscaled, scale } = parse(typeof value === 'number' ? String(value) : value);
    return new BigDecimal(unscaled, scale);
  }

  static ZERO(): BigDecimal {
    return ZERO;
  }

  static ONE(): BigDecimal {
    return ONE;
  }

  static readonly ROUND_UP = ROUND_UP;
  static readonly ROUND_DOWN = ROUND_DOWN;

  /** Beide Werte auf dieselbe Skalierung bringen. */
  private align(other: BigDecimal): [bigint, bigint, number] {
    const scale = Math.max(this.scale, other.scale);
    return [
      this.unscaled * pow10(scale - this.scale),
      other.unscaled * pow10(scale - other.scale),
      scale,
    ];
  }

  add(other: BigDecimal): BigDecimal {
    const [a, b, scale] = this.align(other);
    return new BigDecimal(a + b, scale);
  }

  subtract(other: BigDecimal): BigDecimal {
    const [a, b, scale] = this.align(other);
    return new BigDecimal(a - b, scale);
  }

  multiply(other: BigDecimal): BigDecimal {
    return new BigDecimal(this.unscaled * other.unscaled, this.scale + other.scale);
  }

  /**
   * Division. Ohne `scale` wird — wie in Java — das exakte Ergebnis gebildet.
   * Lässt sich der Quotient nicht endlich darstellen, wird mit großzügiger
   * Genauigkeit abgeschnitten statt zu scheitern.
   */
  divide(other: BigDecimal, scale?: number, mode: RoundingMode = ROUND_DOWN): BigDecimal {
    if (other.unscaled === 0n) throw new RangeError('Division durch Null');

    if (scale === undefined) {
      // (u1 / 10^s1) / (u2 / 10^s2) = (u1 * 10^s2) / (u2 * 10^s1)
      let num = this.unscaled * pow10(other.scale);
      let den = other.unscaled * pow10(this.scale);
      if (den < 0n) {
        num = -num;
        den = -den;
      }
      const g = gcd(num, den);
      if (g > 1n) {
        num /= g;
        den /= g;
      }
      // Endlich darstellbar, wenn der Nenner nur die Faktoren 2 und 5 enthält.
      let rest = den;
      let twos = 0;
      let fives = 0;
      while (rest % 2n === 0n) {
        rest /= 2n;
        twos++;
      }
      while (rest % 5n === 0n) {
        rest /= 5n;
        fives++;
      }
      if (rest === 1n) {
        const exact = Math.max(twos, fives);
        return new BigDecimal((num * pow10(exact)) / den, exact);
      }
      // Nicht endlich: mit 20 zusätzlichen Stellen abschneiden.
      const fallback = 20;
      return new BigDecimal(divRound(num * pow10(fallback), den, ROUND_DOWN), fallback);
    }

    let num = this.unscaled * pow10(other.scale + scale);
    let den = other.unscaled * pow10(this.scale);
    if (den < 0n) {
      num = -num;
      den = -den;
    }
    return new BigDecimal(divRound(num, den, mode), scale);
  }

  setScale(scale: number, mode: RoundingMode = ROUND_DOWN): BigDecimal {
    if (scale === this.scale) return this;
    if (scale > this.scale) return new BigDecimal(this.unscaled * pow10(scale - this.scale), scale);
    return new BigDecimal(divRound(this.unscaled, pow10(this.scale - scale), mode), scale);
  }

  /** -1, 0 oder 1 — wie Java's compareTo (ignoriert nachlaufende Nullen). */
  compareTo(other: BigDecimal): number {
    const [a, b] = this.align(other);
    return a < b ? -1 : a > b ? 1 : 0;
  }

  /** Auf ganze Zahl abgeschnitten (zur Null hin), wie Java's longValue(). */
  longValue(): number {
    return Number(this.setScale(0, ROUND_DOWN).unscaled);
  }

  intValue(): number {
    return this.longValue();
  }

  doubleValue(): number {
    return Number(this.toString());
  }

  toString(): string {
    const negative = this.unscaled < 0n;
    const digits = (negative ? -this.unscaled : this.unscaled).toString();
    const sign = negative ? '-' : '';
    if (this.scale === 0) return `${sign}${digits}`;
    const padded = digits.padStart(this.scale + 1, '0');
    const cut = padded.length - this.scale;
    return `${sign}${padded.slice(0, cut)}.${padded.slice(cut)}`;
  }
}

const ZERO = new BigDecimal(0n, 0);
const ONE = new BigDecimal(1n, 0);

export default BigDecimal;
