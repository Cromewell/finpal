import { useMemo, useState } from 'react';
import { eur, eurRund, stunden as fmtStunden } from '../lib/format';
import type { TeilzeitPunkt } from '../lib/teilzeit';
import { useElementWidth } from './useElementWidth';

const FARBE_NETTO = 'var(--series-1)';
const FARBE_BRUTTO = 'var(--series-2)';

interface Props {
  punkte: TeilzeitPunkt[];
  stundenIst: number;
  stundenZiel: number;
}

/** Runde, gut lesbare Achsenschritte für einen Wertebereich. */
function achsenSchritte(max: number, anzahl = 5): number[] {
  if (max <= 0) return [0];
  const rohSchritt = max / anzahl;
  const groessenordnung = 10 ** Math.floor(Math.log10(rohSchritt));
  const kandidaten = [1, 2, 2.5, 5, 10].map((f) => f * groessenordnung);
  const schritt = kandidaten.find((k) => k >= rohSchritt) ?? kandidaten[kandidaten.length - 1]!;
  const werte: number[] = [];
  for (let w = 0; w <= max + schritt * 0.001; w += schritt) werte.push(Math.round(w * 100) / 100);
  return werte;
}

/** Achsenschritte für die Stundenachse — ganze, vertraute Zahlen. */
function stundenSchritte(min: number, max: number): number[] {
  const spanne = max - min;
  const schritt = spanne > 36 ? 10 : spanne > 18 ? 5 : spanne > 8 ? 2 : 1;
  const werte: number[] = [];
  const start = Math.ceil(min / schritt) * schritt;
  for (let w = start; w <= max + 0.001; w += schritt) werte.push(w);
  if (werte[werte.length - 1] !== max) werte.push(max);
  return werte;
}

export function VerlaufChart({ punkte, stundenIst, stundenZiel }: Props) {
  const [ref, breite] = useElementWidth<HTMLDivElement>();
  const [aktiv, setzeAktiv] = useState<number | null>(null);

  const kompakt = breite < 520;
  const padLinks = kompakt ? 46 : 58;
  const padRechts = kompakt ? 54 : 78;
  const padOben = 22;
  const padUnten = 38;
  const hoehe = kompakt ? 240 : 300;

  const innenBreite = Math.max(60, breite - padLinks - padRechts);
  const innenHoehe = hoehe - padOben - padUnten;

  const geometrie = useMemo(() => {
    if (punkte.length === 0) return null;
    const xMin = punkte[0]!.stunden;
    const xMax = punkte[punkte.length - 1]!.stunden;
    const spanne = xMax - xMin || 1;
    const yMax = Math.max(...punkte.map((p) => p.bruttoMonat)) * 1.08 || 1;

    const x = (std: number) => padLinks + ((std - xMin) / spanne) * innenBreite;
    const y = (wert: number) => padOben + innenHoehe - (wert / yMax) * innenHoehe;

    const linie = (hole: (p: TeilzeitPunkt) => number) =>
      punkte.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.stunden).toFixed(1)},${y(hole(p)).toFixed(1)}`).join(' ');

    const band = [
      ...punkte.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.stunden).toFixed(1)},${y(p.bruttoMonat).toFixed(1)}`),
      ...[...punkte].reverse().map((p) => `L${x(p.stunden).toFixed(1)},${y(p.nettoMonat).toFixed(1)}`),
      'Z',
    ].join(' ');

    return {
      x, y, xMin, xMax, yMax,
      pfadBrutto: linie((p) => p.bruttoMonat),
      pfadNetto: linie((p) => p.nettoMonat),
      pfadBand: band,
      yTicks: achsenSchritte(yMax),
      xTicks: stundenSchritte(xMin, xMax),
    };
  }, [punkte, padLinks, innenBreite, innenHoehe]);

  // Vor der ersten Messung nur die Fläche reservieren — siehe useElementWidth.
  if (!geometrie || punkte.length === 0 || breite === 0) {
    return <div className="chart" ref={ref} style={{ height: hoehe }} />;
  }

  const { x, y, xMin, xMax, yTicks, xTicks, pfadBrutto, pfadNetto, pfadBand } = geometrie;
  const letzter = punkte[punkte.length - 1]!;
  const gezeigt = aktiv !== null ? punkte[aktiv] : undefined;

  const naechsterPunkt = (klientX: number, element: SVGSVGElement) => {
    const rahmen = element.getBoundingClientRect();
    const roh = ((klientX - rahmen.left - padLinks) / innenBreite) * (xMax - xMin) + xMin;
    let beste = 0;
    let abstand = Infinity;
    punkte.forEach((p, i) => {
      const d = Math.abs(p.stunden - roh);
      if (d < abstand) { abstand = d; beste = i; }
    });
    return beste;
  };

  const zielMarke = (wert: number, text: string, betont: boolean) => (
    <g key={text}>
      <line
        x1={x(wert)} x2={x(wert)} y1={padOben - 4} y2={padOben + innenHoehe}
        className={betont ? 'chart__target' : 'chart__crosshair'}
      />
      <rect
        x={x(wert) - (betont ? 17 : 21)} y={padOben - 18}
        width={betont ? 34 : 42} height={15} rx={4}
        fill={betont ? 'var(--accent)' : 'var(--ink-secondary)'}
      />
      <text
        x={x(wert)} y={padOben - 7} textAnchor="middle"
        className="chart__target-flag-text"
        fill={betont ? 'var(--on-accent)' : 'var(--surface)'}
      >
        {text}
      </text>
    </g>
  );

  // Der Hinweiskasten stellt sich neben das Fadenkreuz — auf die Seite mit mehr
  // Platz — und bleibt damit von den Markierungen am oberen Rand weg.
  const TOOLTIP_BREITE = 190;
  const kreuzX = gezeigt ? x(gezeigt.stunden) : 0;
  const tooltipLinks = Math.min(
    Math.max(6, kreuzX > breite / 2 ? kreuzX - TOOLTIP_BREITE - 14 : kreuzX + 14),
    Math.max(6, breite - TOOLTIP_BREITE - 6),
  );
  const tooltipOben = gezeigt
    ? Math.min(Math.max(padOben, y(gezeigt.nettoMonat) - 52), hoehe - 108)
    : padOben;

  return (
    <div className="chart" ref={ref}>
      <svg
        width={breite} height={hoehe} role="img"
        aria-label={`Verlauf von Brutto und Netto über die Wochenstunden, von ${fmtStunden(xMin)} bis ${fmtStunden(xMax)} Stunden. Bei ${fmtStunden(stundenZiel)} Stunden bleiben ${eur(punkte.find((p) => p.stunden === stundenZiel)?.nettoMonat ?? 0)} netto im Monat.`}
        onPointerMove={(e) => setzeAktiv(naechsterPunkt(e.clientX, e.currentTarget))}
        onPointerLeave={() => setzeAktiv(null)}
      >
        {/* Waagerechte Hilfslinien mit Beschriftung */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={padLinks} x2={padLinks + innenBreite} y1={y(t)} y2={y(t)} className="chart__grid" />
            <text x={padLinks - 8} y={y(t) + 4} textAnchor="end" className="chart__tick">
              {t === 0 ? '0' : eurRund(t).replace(' €', '')}
            </text>
          </g>
        ))}

        {/* Die Fläche zwischen Brutto und Netto ist genau das, was abgeht. */}
        <path d={pfadBand} fill={FARBE_BRUTTO} opacity={0.1} />

        <path d={pfadBrutto} className="chart__line" stroke={FARBE_BRUTTO} />
        <path d={pfadNetto} className="chart__line" stroke={FARBE_NETTO} />

        {/* Markierungen für Ist und Ziel */}
        {stundenIst !== stundenZiel && zielMarke(stundenIst, 'Jetzt', false)}
        {zielMarke(stundenZiel, 'Ziel', true)}

        {/* Endpunkte mit Wert */}
        {([
          { wert: letzter.bruttoMonat, farbe: FARBE_BRUTTO },
          { wert: letzter.nettoMonat, farbe: FARBE_NETTO },
        ]).map(({ wert, farbe }) => (
          <g key={farbe}>
            <circle cx={x(letzter.stunden)} cy={y(wert)} r={4} fill={farbe} className="chart__marker-ring" />
            <text x={x(letzter.stunden) + 10} y={y(wert) + 4} className="chart__end-label">
              {eurRund(wert)}
            </text>
          </g>
        ))}

        {/* Fadenkreuz */}
        {gezeigt && (
          <g>
            <line
              x1={x(gezeigt.stunden)} x2={x(gezeigt.stunden)}
              y1={padOben} y2={padOben + innenHoehe} className="chart__crosshair"
            />
            <circle cx={x(gezeigt.stunden)} cy={y(gezeigt.bruttoMonat)} r={4.5}
              fill={FARBE_BRUTTO} className="chart__marker-ring" />
            <circle cx={x(gezeigt.stunden)} cy={y(gezeigt.nettoMonat)} r={4.5}
              fill={FARBE_NETTO} className="chart__marker-ring" />
          </g>
        )}

        {/* Stundenachse */}
        <line x1={padLinks} x2={padLinks + innenBreite} y1={padOben + innenHoehe}
          y2={padOben + innenHoehe} className="chart__axis" />
        {xTicks.map((t) => (
          <text key={t} x={x(t)} y={padOben + innenHoehe + 17} textAnchor="middle" className="chart__tick">
            {fmtStunden(t)}
          </text>
        ))}
        <text x={padLinks + innenBreite} y={hoehe - 4} textAnchor="end" className="chart__axis-title">
          Wochenstunden
        </text>
      </svg>

      {gezeigt && (
        <div className="tooltip" style={{ left: tooltipLinks, top: tooltipOben, width: TOOLTIP_BREITE }}>
          <div className="tooltip__head">{fmtStunden(gezeigt.stunden)} Stunden / Woche</div>
          <div className="tooltip__row">
            <span className="tooltip__key" style={{ background: FARBE_BRUTTO }} />
            <span className="tooltip__name">Brutto</span>
            <span className="tooltip__val">{eur(gezeigt.bruttoMonat)}</span>
          </div>
          <div className="tooltip__row">
            <span className="tooltip__key" style={{ background: FARBE_NETTO }} />
            <span className="tooltip__name">Netto</span>
            <span className="tooltip__val">{eur(gezeigt.nettoMonat)}</span>
          </div>
          <div className="tooltip__foot">
            Abgaben {eur(gezeigt.bruttoMonat - gezeigt.nettoMonat)} · netto je Wochenstunde{' '}
            {eur(gezeigt.nettoProWochenstunde)}
          </div>
        </div>
      )}

      <div className="legend" style={{ marginTop: 10 }}>
        <span className="legend__item">
          <span className="legend__key" style={{ background: FARBE_BRUTTO }} />Brutto im Monat
        </span>
        <span className="legend__item">
          <span className="legend__key" style={{ background: FARBE_NETTO }} />Netto im Monat
        </span>
        <span className="legend__item" style={{ color: 'var(--ink-muted)' }}>
          Die Fläche dazwischen sind Steuern und Sozialabgaben
        </span>
      </div>
    </div>
  );
}
