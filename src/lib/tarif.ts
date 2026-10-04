/**
 * Einkommensteuertarif 2026 nach § 32a EStG.
 *
 * Der Lohnsteuerabzug läuft über den amtlichen Programmablaufplan; für die
 * Jahressteuer — etwa auf eine Rente — wird der Tarif selbst gebraucht. Die
 * Koeffizienten stammen aus dem Gesetzestext und decken sich mit denen im
 * generierten Rechenkern (vendor/Lohnsteuer2026.xml).
 */

import { STEUER } from './constants';

/** Tarifliche Einkommensteuer für ein zu versteuerndes Einkommen, in Euro. */
export function einkommensteuer(zvE: number): number {
  // Das zu versteuernde Einkommen wird auf volle Euro abgerundet, das
  // Ergebnis ebenfalls (§ 32a Abs. 1 Satz 6 EStG).
  const x = Math.floor(Math.max(0, zvE));

  if (x <= 12_348) return 0;
  if (x <= 17_799) {
    const y = (x - 12_348) / 10_000;
    return Math.floor((914.51 * y + 1_400) * y);
  }
  if (x <= 69_878) {
    const z = (x - 17_799) / 10_000;
    return Math.floor((173.1 * z + 2_397) * z + 1_034.87);
  }
  if (x <= 277_825) return Math.floor(0.42 * x - 11_135.63);
  return Math.floor(0.45 * x - 19_470.38);
}

/** Splittingverfahren für zusammen veranlagte Ehegatten (§ 32a Abs. 5 EStG). */
export function einkommensteuerSplitting(zvE: number): number {
  return 2 * einkommensteuer(Math.max(0, zvE) / 2);
}

/**
 * Solidaritätszuschlag auf die Einkommensteuer, mit Freigrenze und
 * Milderungszone (§ 4 SolzG).
 */
export function solidaritaetszuschlag(steuer: number, zusammenveranlagt = false): number {
  const freigrenze = STEUER.soliFreigrenze * (zusammenveranlagt ? 2 : 1);
  if (steuer <= freigrenze) return 0;
  const voll = steuer * STEUER.soliSatz;
  const milderung = (steuer - freigrenze) * 0.119;
  return Math.round(Math.min(voll, milderung) * 100) / 100;
}

/** Grenzsteuersatz an einer Stelle des Tarifs — für Erläuterungen. */
export function grenzsteuersatz(zvE: number): number {
  const stufe = 100;
  return (einkommensteuer(zvE + stufe) - einkommensteuer(zvE)) / stufe;
}
