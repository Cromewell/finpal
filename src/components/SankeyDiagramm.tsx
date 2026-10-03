import { useMemo, useState } from 'react';
import type { Budget } from '../lib/budget';
import { baueSankey, type KnotenArt, type SankeyKnoten } from '../lib/sankey';
import { eur, eurRund, prozent } from '../lib/format';
import { useElementWidth } from './useElementWidth';

/** Unterhalb dieser Breite wird das Diagramm waagerecht scrollbar. */
const MINDESTBREITE = 760;
const TOOLTIP_BREITE = 194;

const FARBE: Record<KnotenArt, string> = {
  einnahme: 'var(--fluss-einnahme)',
  fehlbetrag: 'var(--fluss-fehlbetrag)',
  gesamt: 'var(--fluss-gesamt)',
  ausgabe: 'var(--fluss-ausgabe)',
  unterposten: 'var(--fluss-unterposten)',
  ueberschuss: 'var(--fluss-ueberschuss)',
};

interface Props {
  budget: Budget;
  /** Enden auffächern, damit jede Beschriftung Platz hat. */
  aufgefaechert: boolean;
}

export function SankeyDiagramm({ budget, aufgefaechert }: Props) {
  const [ref, gemessen] = useElementWidth<HTMLDivElement>();
  const [aktiv, setzeAktiv] = useState<string | null>(null);
  const [zeiger, setzeZeiger] = useState<{ x: number; y: number } | null>(null);

  const breite = Math.max(MINDESTBREITE, gemessen);
  const kompakt = breite < 820;

  const layout = useMemo(() => {
    const linke = budget.einnahmen.filter((e) => e.betrag > 0).length;
    const rechte = budget.ausgaben.length;
    const kinder = budget.ausgaben.reduce(
      (s, a) => s + a.unterposten.filter((u) => u.betrag > 0).length, 0,
    );
    const hatUnterposten = kinder > 0;

    // Höhe wächst mit der Zahl der Zeilen. Aufgefächert braucht jedes Ende
    // seine eigene Zeile — das Bild wird dann zwangsläufig höher.
    const zeilen = Math.max(linke, rechte, aufgefaechert ? kinder : kinder * 0.8);
    const proZeile = kompakt ? 36 : 46;
    const hoehe = aufgefaechert
      ? Math.min(1400, Math.max(360, 64 + zeilen * (kompakt ? 34 : 40)))
      : kompakt
        ? Math.min(520, Math.max(300, 48 + zeilen * proZeile))
        : Math.min(820, Math.max(340, 56 + zeilen * proZeile));

    return baueSankey(budget, {
      breite,
      hoehe,
      aufgefaechert,
      // Die Kategorienamen stehen jetzt links vom Knoten. Ohne Unterposten
      // bleibt rechts deshalb nur ein schmaler Rand nötig.
      randLinks: kompakt ? 150 : 198,
      randRechts: hatUnterposten ? (kompakt ? 158 : 208) : 28,
    });
  }, [budget, breite, kompakt, aufgefaechert]);

  if (layout.leer || gemessen === 0) {
    return (
      <div className="sankey" ref={ref}>
        {gemessen > 0 && (
          <p className="sankey__leer">
            Noch nichts zu zeigen — tragen Sie links mindestens eine Einnahme mit Betrag ein.
          </p>
        )}
      </div>
    );
  }

  const nachId = new Map(layout.knoten.map((k) => [k.id, k]));

  /** Direkt verbundene Knoten und Bänder — alles andere tritt zurück. */
  const verbunden = (() => {
    if (!aktiv) return null;
    const knoten = new Set<string>([aktiv]);
    const fluesse = new Set<string>();
    for (const f of layout.fluesse) {
      if (f.von === aktiv || f.nach === aktiv) {
        fluesse.add(f.id);
        knoten.add(f.von);
        knoten.add(f.nach);
      }
    }
    return { knoten, fluesse };
  })();

  const gedimmt = (id: string, art: 'knoten' | 'fluss') =>
    verbunden !== null && !(art === 'knoten' ? verbunden.knoten : verbunden.fluesse).has(id);

  /**
   * Beschriftungen vergeben, ohne dass sie sich überlagern — ein überlagertes
   * Etikett ist schlechter als keines. Vergeben wird nach Betrag, nicht nach
   * Position: Sonst verdrängt ein kleiner Posten zufällig den größeren
   * darunter. Was keinen Platz findet, steht in der Tabelle darunter.
   */
  const sichtbareLabel = (() => {
    const ZEILE = 15;
    const erlaubt = new Set<string>();
    for (const spalte of [0, 2, 3]) {
      const belegt: number[] = [];
      const reihe = layout.knoten
        .filter((n) => n.spalte === spalte)
        .sort((a, b) => b.wert - a.wert);
      for (const k of reihe) {
        const mitte = (k.y0 + k.y1) / 2;
        if (belegt.every((m) => Math.abs(m - mitte) >= ZEILE)) {
          erlaubt.add(k.id);
          belegt.push(mitte);
        }
      }
    }
    return erlaubt;
  })();

  const aktiverKnoten = aktiv ? nachId.get(aktiv) : undefined;

  const beschriftung = (k: SankeyKnoten) => {
    if (k.labelSeite === 'oben') {
      return (
        <text key={`l-${k.id}`} x={(k.x0 + k.x1) / 2} y={k.y0 - 10} textAnchor="middle" className="sankey__label">
          <tspan className="sankey__label-name">{k.name}</tspan>
          <tspan className="sankey__label-wert" dx="6">{eurRund(k.wert)}</tspan>
        </text>
      );
    }
    const links = k.labelSeite === 'links';
    return (
      <text
        key={`l-${k.id}`}
        x={links ? k.x0 - 10 : k.x1 + 10}
        y={(k.y0 + k.y1) / 2}
        textAnchor={links ? 'end' : 'start'}
        dominantBaseline="middle"
        className="sankey__label"
      >
        <tspan className="sankey__label-name">{k.name}</tspan>
        <tspan className="sankey__label-wert" dx="6">{eurRund(k.wert)}</tspan>
      </text>
    );
  };

  return (
    <div className="sankey" ref={ref}>
      <div className="sankey__scroll">
        <svg
          width={breite}
          height={layout.hoehe}
          role="img"
          aria-label={
            `Geldflussdiagramm: ${eur(layout.summe)} verfügbar, verteilt auf ` +
            layout.knoten.filter((k) => k.spalte === 2)
              .map((k) => `${k.name} ${eur(k.wert)}`).join(', ') + '.'
          }
          onPointerLeave={() => { setzeAktiv(null); setzeZeiger(null); }}
        >
          {/* Bänder zuerst — die Knoten liegen darüber. */}
          <g>
            {layout.fluesse.map((f) => (
              <path
                key={f.id}
                d={f.pfad}
                fill={FARBE[f.art]}
                className={`sankey__band${gedimmt(f.id, 'fluss') ? ' is-zurueck' : ''}`}
                onPointerEnter={() => setzeAktiv(f.nach === 'gesamt' ? f.von : f.nach)}
                onPointerMove={(e) => setzeZeiger({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
              />
            ))}
          </g>

          <g>
            {layout.knoten.map((k) => (
              <rect
                key={k.id}
                x={k.x0}
                y={k.y0}
                width={k.x1 - k.x0}
                height={Math.max(1, k.y1 - k.y0)}
                rx={2}
                fill={FARBE[k.art]}
                className={`sankey__knoten${gedimmt(k.id, 'knoten') ? ' is-zurueck' : ''}`}
                onPointerEnter={() => setzeAktiv(k.id)}
                onPointerMove={(e) => setzeZeiger({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })}
              />
            ))}
          </g>

          <g className="sankey__labels">
            {layout.knoten
              .filter((k) => k.labelSeite === 'oben' || sichtbareLabel.has(k.id))
              .map(beschriftung)}
          </g>
        </svg>
      </div>

      {gemessen < MINDESTBREITE && (
        <p className="sankey__hinweis">
          Seitwärts wischen für das ganze Bild — alle Werte stehen auch in der Tabelle darunter.
        </p>
      )}

      {aktiverKnoten && zeiger && (
        <div
          className="tooltip"
          style={{
            // Auf die Seite mit mehr Platz legen, damit der Kasten nicht
            // ausgerechnet den Posten verdeckt, auf dem der Zeiger steht.
            left: zeiger.x > breite / 2
              ? Math.max(8, zeiger.x - TOOLTIP_BREITE - 18)
              : Math.min(zeiger.x + 18, Math.max(8, breite - TOOLTIP_BREITE - 8)),
            top: Math.max(8, Math.min(zeiger.y - 12, layout.hoehe - 104)),
            width: TOOLTIP_BREITE,
          }}
        >
          <div className="tooltip__head">{aktiverKnoten.name}</div>
          <div className="tooltip__row">
            <span className="tooltip__key" style={{ background: FARBE[aktiverKnoten.art] }} />
            <span className="tooltip__name">Betrag</span>
            <span className="tooltip__val">{eur(aktiverKnoten.wert)}</span>
          </div>
          <div className="tooltip__foot">
            {prozent(aktiverKnoten.anteil)} von {eur(layout.summe)}
          </div>
        </div>
      )}
    </div>
  );
}
