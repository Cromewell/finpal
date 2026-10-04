let zaehler = 0;

/** Kurze, eindeutige Kennung — bleibt über Speichern und Teilen hinweg stabil. */
export function neueId(praefix: string): string {
  zaehler += 1;
  return `${praefix}${Date.now().toString(36)}${zaehler.toString(36)}`;
}
