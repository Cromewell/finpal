import { useMemo, useState } from 'react';
import { achsenSchritte, ganzeSchritte } from './achsen';
import { useElementWidth } from './useElementWidth';

export interface Reihe {
  name: string;
  farbe: string;
  werte: number[];
  /** Fläche unter der Linie andeuten. */
  flaeche?: boolean;
}

export interface Marke {
  x: number;
  text: string;
  /** Hervorgehoben in Akzentfarbe statt zurückhaltend. */
  betont?: boolean;
}

interface Props {
  /** Werte der waagerechten Achse, aufsteigend. */
  x: number[];
  reihen: Reihe[];
  xBeschriftung: string;
  formatX: (wert: number) => string;
  /** Kurzform für die Achsenbeschriftung. */
  formatAchse: (wert: number) => string;
  /** Ausführliche Form für den Hinweiskasten. */
  formatWert: (wert: number) => string;
  marken?: Marke[];
  hoehe?: number;
}

/**
 * Schlichtes Liniendiagramm für Verläufe über die Zeit.
 * Gemeinsam genutzt von Tilgungs- und Entnahmeplan.
 */
export function LinienDiagramm({
  x, reihen, xBeschriftung, formatX, formatAchse, formatWert, marken = [], hoehe: hoeheVorgabe,
}: Props) {
  const [ref, gemessen] = useElementWidth<HTMLDivElement>();
  const [aktiv, setzeAktiv] = useState<number | null>(null);

  const kompakt = gemessen < 520;
  const padLinks = kompakt ? 50 : 62;
  const padRechts = kompakt ? 16 : 24;
  const padOben = 26;
  const padUnten = 38;
  const hoehe = hoeheVorgabe ?? (kompakt ? 240 : 300);

  const innenBreite = Math.max(60, gemessen - padLinks - padRechts);
  const innenHoehe = hoehe - padOben - padUnten;

  const geo = useMemo(() => {
    if (x.length === 0 || reihen.length === 0) return null;
    const xMin = x[0]!;
    const xMax = x[x.length - 1]!;
    const spanne = xMax - xMin || 1;
    const yMax = Math.max(1, ...reihen.flatMap((r) => r.werte)) * 1.08;

    const px = (wert: number) => padLinks + ((wert - xMin) / spanne) * innenBreite;
    const py = (wert: number) => padOben + innenHoehe - (wert / yMax) * innenHoehe;

    return {
      px, py, xMin, xMax,
      yTicks: achsenSchritte(yMax),
      xTicks: ganzeSchritte(xMin, xMax),
      pfade: reihen.map((r) => ({
        linie: r.werte
          .map((w, i) => `${i === 0 ? 'M' : 'L'}${px(x[i]!).toFixed(1)},${py(w).toFixed(1)}`)
          .join(' '),
        flaeche: r.flaeche
          ? `M${px(xMin).toFixed(1)},${py(0).toFixed(1)} `
            + r.werte.map((w, i) => `L${px(x[i]!).toFixed(1)},${py(w).toFixed(1)}`).join(' ')
            + ` L${px(xMax).toFixed(1)},${py(0).toFixed(1)}Z`
          : null,
      })),
    };
  }, [x, reihen, padLinks, innenBreite, innenHoehe]);

  if (!geo || gemessen === 0) {
    return <div className="chart" ref={ref} style={{ height: hoehe }} />;
  }

  const { px, py, xMin, xMax, yTicks, xTicks, pfade } = geo;

  const naechster = (klientX: number, element: SVGSVGElement) => {
    const rahmen = element.getBoundingClientRect();
    const roh = ((klientX - rahmen.left - padLinks) / innenBreite) * (xMax - xMin) + xMin;
    let beste = 0;
    let abstand = Infinity;
    x.forEach((wert, i) => {
      const d = Math.abs(wert - roh);
      if (d < abstand) { abstand = d; beste = i; }
    });
    return beste;
  };

  const TOOLTIP = 186;
  const kreuzX = aktiv !== null ? px(x[aktiv]!) : 0;

  return (
    <div className="chart" ref={ref}>
      <svg
        width={gemessen}
        height={hoehe}
        role="img"
        aria-label={`${reihen.map((r) => r.name).join(' und ')} über ${xBeschriftung}, von ${formatX(xMin)} bis ${formatX(xMax)}.`}
        onPointerMove={(e) => setzeAktiv(naechster(e.clientX, e.currentTarget))}
        onPointerLeave={() => setzeAktiv(null)}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padLinks} x2={padLinks + innenBreite} y1={py(t)} y2={py(t)} className="chart__grid" />
            <text x={padLinks - 8} y={py(t) + 4} textAnchor="end" className="chart__tick">
              {t === 0 ? '0' : formatAchse(t)}
            </text>
          </g>
        ))}

        {pfade.map((p, i) => (
          <g key={reihen[i]!.name}>
            {p.flaeche && <path d={p.flaeche} fill={reihen[i]!.farbe} opacity={0.1} />}
            <path d={p.linie} className="chart__line" stroke={reihen[i]!.farbe} />
          </g>
        ))}

        {marken.map((m) => (
          <g key={m.text}>
            <line
              x1={px(m.x)} x2={px(m.x)} y1={padOben - 4} y2={padOben + innenHoehe}
              className={m.betont ? 'chart__target' : 'chart__crosshair'}
            />
            <rect
              x={px(m.x) - m.text.length * 3.3 - 6} y={padOben - 18}
              width={m.text.length * 6.6 + 12} height={15} rx={4}
              fill={m.betont ? 'var(--accent)' : 'var(--ink-secondary)'}
            />
            <text
              x={px(m.x)} y={padOben - 7} textAnchor="middle"
              className="chart__target-flag-text"
              fill={m.betont ? 'var(--on-accent)' : 'var(--surface)'}
            >
              {m.text}
            </text>
          </g>
        ))}

        {aktiv !== null && (
          <g>
            <line
              x1={kreuzX} x2={kreuzX} y1={padOben} y2={padOben + innenHoehe}
              className="chart__crosshair"
            />
            {reihen.map((r) => (
              <circle
                key={r.name}
                cx={kreuzX} cy={py(r.werte[aktiv] ?? 0)} r={4.5}
                fill={r.farbe} className="chart__marker-ring"
              />
            ))}
          </g>
        )}

        <line
          x1={padLinks} x2={padLinks + innenBreite}
          y1={padOben + innenHoehe} y2={padOben + innenHoehe} className="chart__axis"
        />
        {xTicks.map((t) => (
          <text key={t} x={px(t)} y={padOben + innenHoehe + 17} textAnchor="middle" className="chart__tick">
            {formatX(t)}
          </text>
        ))}
        <text x={padLinks + innenBreite} y={hoehe - 4} textAnchor="end" className="chart__axis-title">
          {xBeschriftung}
        </text>
      </svg>

      {aktiv !== null && (
        <div
          className="tooltip"
          style={{
            left: kreuzX > gemessen / 2
              ? Math.max(8, kreuzX - TOOLTIP - 16)
              : Math.min(kreuzX + 16, Math.max(8, gemessen - TOOLTIP - 8)),
            top: 8,
            width: TOOLTIP,
          }}
        >
          <div className="tooltip__head">{formatX(x[aktiv]!)}</div>
          {reihen.map((r) => (
            <div className="tooltip__row" key={r.name}>
              <span className="tooltip__key" style={{ background: r.farbe }} />
              <span className="tooltip__name">{r.name}</span>
              <span className="tooltip__val">{formatWert(r.werte[aktiv] ?? 0)}</span>
            </div>
          ))}
        </div>
      )}

      {reihen.length > 1 && (
        <div className="legend" style={{ marginTop: 10 }}>
          {reihen.map((r) => (
            <span className="legend__item" key={r.name}>
              <span className="legend__key" style={{ background: r.farbe }} />{r.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
