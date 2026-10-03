import { eur, prozent } from '../lib/format';
import { useElementWidth } from './useElementWidth';

export interface Segment {
  name: string;
  wert: number;
  farbe: string;
}

/**
 * Gestapelter Balken für die Aufteilung des Bruttos.
 * Die Segmente werden durch eine 2 px schmale Lücke in Flächenfarbe getrennt —
 * nicht durch Rahmen. Beschriftet wird nur, wo der Text nachweislich passt;
 * alle Werte stehen zusätzlich in der Legende.
 */
export function VerteilungBalken({ segmente, gesamt }: { segmente: Segment[]; gesamt: number }) {
  const [ref, breite] = useElementWidth<HTMLDivElement>();
  const summe = gesamt > 0 ? gesamt : segmente.reduce((s, x) => s + x.wert, 0) || 1;
  const sichtbar = segmente.filter((s) => s.wert > 0);

  return (
    <div className="bar">
      <div className="bar__track" ref={ref} role="img"
        aria-label={sichtbar.map((s) => `${s.name}: ${eur(s.wert)}`).join(', ')}>
        {sichtbar.map((s) => {
          const anteil = s.wert / summe;
          const pixel = anteil * breite;
          const text = prozent(anteil, 0);
          // Platz für den Text plus je 6 px Innenabstand auf beiden Seiten.
          const passt = breite > 0 && pixel > text.length * 7 + 14;
          return (
            <div
              key={s.name}
              className="bar__seg"
              style={{ flex: `0 0 ${anteil * 100}%`, background: s.farbe }}
            >
              {passt && <span className="bar__seg-label">{text}</span>}
            </div>
          );
        })}
      </div>
      <div className="legend">
        {segmente.map((s) => (
          <span className="legend__item" key={s.name}>
            <span className="legend__key" style={{ background: s.farbe }} />
            {s.name}
            <span className="legend__value">{eur(s.wert)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
