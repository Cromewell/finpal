/**
 * Layout für das Geldfluss-Diagramm (Sankey).
 *
 * Der Aufbau ist fest: Einnahmen → gemeinsamer Topf → Ausgaben → Unterposten.
 * Dadurch kommt die Berechnung ohne allgemeinen Graph-Algorithmus aus und
 * bleibt kreuzungsfrei: Die Bänder werden in derselben Reihenfolge gestapelt,
 * in der die Knoten untereinander stehen.
 *
 * Reine Funktion ohne DOM — damit prüfbar.
 */

import { ausgabeBetrag, budgetSummen, type Budget } from './budget';

export type KnotenArt =
  | 'einnahme' | 'fehlbetrag' | 'gesamt' | 'ausgabe' | 'unterposten' | 'ueberschuss';

export interface SankeyKnoten {
  id: string;
  name: string;
  wert: number;
  spalte: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  art: KnotenArt;
  /** Wo die Beschriftung steht, ohne mit Bändern zu kollidieren. */
  labelSeite: 'links' | 'rechts' | 'oben';
  /** Anteil an der Gesamtsumme — für Beschriftung und Tooltip. */
  anteil: number;
}

export interface SankeyFluss {
  id: string;
  von: string;
  nach: string;
  wert: number;
  pfad: string;
  /** Die Farbe folgt der Rolle des Ziels. */
  art: KnotenArt;
}

export interface SankeyLayout {
  knoten: SankeyKnoten[];
  fluesse: SankeyFluss[];
  breite: number;
  hoehe: number;
  /** Gesamtsumme, die durch den Topf fließt. */
  summe: number;
  leer: boolean;
}

export interface LayoutMasse {
  breite: number;
  hoehe: number;
  knotenBreite: number;
  /** Abstand zwischen zwei Knoten derselben Spalte. */
  luecke: number;
  randLinks: number;
  randRechts: number;
  randOben: number;
  randUnten: number;
  /**
   * Fächert die Endknoten auf: Statt das Band ihrer Ausgabe genau auszufüllen,
   * rücken die Unterposten so weit auseinander, dass jede Beschriftung Platz
   * hat. Die Bänder laufen dann schräg — dafür ist jedes Ende lesbar.
   */
  aufgefaechert: boolean;
  /** Mindestabstand zwischen zwei aufgefächerten Endknoten. */
  lueckeEnden: number;
}

export const STANDARD_MASSE: LayoutMasse = {
  breite: 900,
  hoehe: 460,
  knotenBreite: 13,
  luecke: 16,
  randLinks: 168,
  randRechts: 186,
  randOben: 28,
  randUnten: 12,
  aufgefaechert: false,
  lueckeEnden: 20,
};

/**
 * Gewichte der waagerechten Abstände zwischen den Spalten.
 * Die Lücke zwischen Topf und Ausgaben ist die breiteste: Dort stehen die
 * Kategorienamen — auf ihrem eigenen Zufluss, nicht auf den Unterposten.
 */
const ABSTAND_GEWICHTE: Record<number, number[]> = {
  3: [1, 1.9],
  4: [0.9, 1.9, 0.8],
};

/** Bandförmiger Pfad zwischen zwei senkrechten Kanten. */
function bandPfad(
  x0: number, x1: number,
  y0Oben: number, y0Unten: number,
  y1Oben: number, y1Unten: number,
): string {
  const xm = (x0 + x1) / 2;
  const r = (n: number) => Math.round(n * 10) / 10;
  return (
    `M${r(x0)},${r(y0Oben)}` +
    `C${r(xm)},${r(y0Oben)} ${r(xm)},${r(y1Oben)} ${r(x1)},${r(y1Oben)}` +
    `L${r(x1)},${r(y1Unten)}` +
    `C${r(xm)},${r(y1Unten)} ${r(xm)},${r(y0Unten)} ${r(x0)},${r(y0Unten)}Z`
  );
}

const LEER: Omit<SankeyLayout, 'breite' | 'hoehe'> = {
  knoten: [], fluesse: [], summe: 0, leer: true,
};

export function baueSankey(budget: Budget, masse: Partial<LayoutMasse> = {}): SankeyLayout {
  const m = { ...STANDARD_MASSE, ...masse };
  const summen = budgetSummen(budget);

  const einnahmen = budget.einnahmen.filter((e) => e.betrag > 0);
  const ausgaben = budget.ausgaben
    .map((a) => ({ ...a, summe: ausgabeBetrag(a) }))
    .filter((a) => a.summe > 0);

  // Reicht das Geld nicht, erscheint die Lücke als eigene Quelle links.
  const fehlbetrag = summen.saldo < 0 ? -summen.saldo : 0;
  const ueberschuss = summen.saldo > 0 ? summen.saldo : 0;
  const summe = summen.einnahmen + fehlbetrag;

  if (summe <= 0 || (einnahmen.length === 0 && fehlbetrag === 0)) {
    return { ...LEER, breite: m.breite, hoehe: m.hoehe };
  }

  const hatUnterposten = ausgaben.some((a) => a.unterposten.some((u) => u.betrag > 0));
  const spalten = hatUnterposten ? 4 : 3;

  const innenBreite = Math.max(120, m.breite - m.randLinks - m.randRechts);
  const gewichte = ABSTAND_GEWICHTE[spalten] ?? [1, 1];
  const gesamtAbstand = Math.max(0, innenBreite - m.knotenBreite * spalten);
  const summeGewichte = gewichte.reduce((a, b) => a + b, 0);
  const abstaende = gewichte.map((g) => (gesamtAbstand * g) / summeGewichte);
  const spalteX = (i: number) =>
    m.randLinks + i * m.knotenBreite + abstaende.slice(0, i).reduce((a, b) => a + b, 0);

  const innenHoehe = Math.max(80, m.hoehe - m.randOben - m.randUnten);

  // Linke Spalte: Einnahmen (+ ggf. Fehlbetrag). Rechte Spalte: Ausgaben (+ Überschuss).
  const linkeAnzahl = einnahmen.length + (fehlbetrag > 0 ? 1 : 0);
  const rechteAnzahl = ausgaben.length + (ueberschuss > 0 ? 1 : 0);
  const maxLuecken = Math.max(linkeAnzahl - 1, rechteAnzahl - 1, 0);

  const mitKindern = ausgaben.filter((a) => a.unterposten.some((u) => u.betrag > 0));
  const kinderGesamt = mitKindern.reduce(
    (s, a) => s + a.unterposten.filter((u) => u.betrag > 0).length, 0,
  );
  const kinderSumme = mitKindern.reduce((s, a) => s + a.summe, 0);
  // Im aufgefächerten Modus steht zwischen allen Enden eine Lücke, zwischen
  // zwei Gruppen eine etwas größere.
  const faechern = m.aufgefaechert && hatUnterposten;
  const lueckenEnden = faechern
    ? m.lueckeEnden * Math.max(0, kinderGesamt - 1) + m.luecke * Math.max(0, mitKindern.length - 1)
    : 0;

  // Ein gemeinsamer Maßstab für alle Spalten — nur so sind die Bänder
  // über die gesamte Breite hinweg mengentreu.
  const k = Math.max(0, Math.min(
    (innenHoehe - m.luecke * maxLuecken) / summe,
    faechern && kinderSumme > 0 ? (innenHoehe - lueckenEnden) / kinderSumme : Number.POSITIVE_INFINITY,
  ));

  const knoten: SankeyKnoten[] = [];
  const fluesse: SankeyFluss[] = [];
  const anteil = (wert: number) => (summe > 0 ? wert / summe : 0);

  const stapel = (anzahl: number, gesamtWert: number) =>
    m.randOben + (innenHoehe - (gesamtWert * k + m.luecke * Math.max(0, anzahl - 1))) / 2;

  // --- Spalte 0: Einnahmen ------------------------------------------------
  let y = stapel(linkeAnzahl, summe);
  const quellen: SankeyKnoten[] = [];
  for (const e of einnahmen) {
    const hoehe = e.betrag * k;
    const knotenEintrag: SankeyKnoten = {
      id: e.id, name: e.name, wert: e.betrag, spalte: 0,
      x0: spalteX(0), x1: spalteX(0) + m.knotenBreite,
      y0: y, y1: y + hoehe,
      art: 'einnahme', labelSeite: 'links', anteil: anteil(e.betrag),
    };
    knoten.push(knotenEintrag); quellen.push(knotenEintrag);
    y += hoehe + m.luecke;
  }
  if (fehlbetrag > 0) {
    const hoehe = fehlbetrag * k;
    const knotenEintrag: SankeyKnoten = {
      id: 'fehlbetrag', name: 'Aus Rücklagen', wert: fehlbetrag, spalte: 0,
      x0: spalteX(0), x1: spalteX(0) + m.knotenBreite,
      y0: y, y1: y + hoehe,
      art: 'fehlbetrag', labelSeite: 'links', anteil: anteil(fehlbetrag),
    };
    knoten.push(knotenEintrag); quellen.push(knotenEintrag);
  }

  // --- Spalte 1: gemeinsamer Topf -----------------------------------------
  const topfHoehe = summe * k;
  const topf: SankeyKnoten = {
    id: 'gesamt', name: 'Verfügbar', wert: summe, spalte: 1,
    x0: spalteX(1), x1: spalteX(1) + m.knotenBreite,
    y0: m.randOben + (innenHoehe - topfHoehe) / 2,
    y1: m.randOben + (innenHoehe - topfHoehe) / 2 + topfHoehe,
    art: 'gesamt', labelSeite: 'oben', anteil: 1,
  };
  knoten.push(topf);

  // Eingehende Bänder in der Reihenfolge der Quellen stapeln — das hält sie
  // kreuzungsfrei, weil die Quellen oben genauso angeordnet sind.
  let topfY = topf.y0;
  for (const q of quellen) {
    const hoehe = q.wert * k;
    fluesse.push({
      id: `f-${q.id}-gesamt`, von: q.id, nach: 'gesamt', wert: q.wert,
      art: q.art,
      pfad: bandPfad(q.x1, topf.x0, q.y0, q.y1, topfY, topfY + hoehe),
    });
    topfY += hoehe;
  }

  // --- Spalte 2: Ausgaben und Überschuss ----------------------------------
  let zielY = stapel(rechteAnzahl, summe);
  let abgangY = topf.y0;
  const ausgabeKnoten: { knoten: SankeyKnoten; unterposten: { id: string; name: string; betrag: number }[] }[] = [];

  for (const a of ausgaben) {
    const hoehe = a.summe * k;
    const kinder = a.unterposten.filter((u) => u.betrag > 0);
    const knotenEintrag: SankeyKnoten = {
      id: a.id, name: a.name, wert: a.summe, spalte: 2,
      x0: spalteX(2), x1: spalteX(2) + m.knotenBreite,
      y0: zielY, y1: zielY + hoehe,
      // Links vom Knoten: Dort liegt der Zufluss dieser Kategorie. Rechts
      // würde das Etikett auf den Bändern ihrer Unterposten liegen.
      art: 'ausgabe', labelSeite: 'links', anteil: anteil(a.summe),
    };
    knoten.push(knotenEintrag);
    ausgabeKnoten.push({ knoten: knotenEintrag, unterposten: kinder });

    fluesse.push({
      id: `f-gesamt-${a.id}`, von: 'gesamt', nach: a.id, wert: a.summe,
      art: 'ausgabe',
      pfad: bandPfad(topf.x1, knotenEintrag.x0, abgangY, abgangY + hoehe, knotenEintrag.y0, knotenEintrag.y1),
    });
    abgangY += hoehe;
    zielY += hoehe + m.luecke;
  }

  if (ueberschuss > 0) {
    const hoehe = ueberschuss * k;
    const knotenEintrag: SankeyKnoten = {
      id: 'ueberschuss', name: 'Bleibt übrig', wert: ueberschuss, spalte: 2,
      x0: spalteX(2), x1: spalteX(2) + m.knotenBreite,
      y0: zielY, y1: zielY + hoehe,
      art: 'ueberschuss', labelSeite: 'links', anteil: anteil(ueberschuss),
    };
    knoten.push(knotenEintrag);
    fluesse.push({
      id: 'f-gesamt-ueberschuss', von: 'gesamt', nach: 'ueberschuss', wert: ueberschuss,
      art: 'ueberschuss',
      pfad: bandPfad(topf.x1, knotenEintrag.x0, abgangY, abgangY + hoehe, knotenEintrag.y0, knotenEintrag.y1),
    });
  }

  // --- Spalte 3: Unterposten ----------------------------------------------
  // Bündig füllen die Kinder das Band ihrer Ausgabe genau aus; getrennt werden
  // sie beim Zeichnen nur durch eine schmale Lücke in Flächenfarbe, nicht durch
  // zusätzlichen Platz — sonst stimmten die Höhenverhältnisse nicht mehr.
  // Aufgefächert bekommt dagegen jedes Ende seinen eigenen Abstand, damit die
  // Beschriftung Platz hat; die Höhen bleiben dabei maßstabsgetreu.
  if (hatUnterposten) {
    // Aufgefächert laufen die Enden durchgehend von oben nach unten, bündig
    // dagegen jeweils innerhalb des Bandes ihrer Ausgabe.
    let faecherY = m.randOben + (innenHoehe - (kinderSumme * k + lueckenEnden)) / 2;
    let ersteGruppe = true;

    for (const { knoten: eltern, unterposten } of ausgabeKnoten) {
      if (unterposten.length === 0) continue;
      // Zwischen zwei Gruppen etwas mehr Luft als zwischen Geschwistern —
      // genau so viel, wie oben in `lueckenEnden` eingerechnet wurde.
      if (faechern && !ersteGruppe) faecherY += m.lueckeEnden + m.luecke;
      ersteGruppe = false;
      let kindY = faechern ? faecherY : eltern.y0;
      // Am Elternknoten bleiben die Abgänge bündig gestapelt — nur das Ziel
      // wandert beim Auffächern nach außen.
      let abgangKind = eltern.y0;
      for (const u of unterposten) {
        const hoehe = u.betrag * k;
        const kind: SankeyKnoten = {
          id: u.id, name: u.name, wert: u.betrag, spalte: 3,
          x0: spalteX(3), x1: spalteX(3) + m.knotenBreite,
          y0: kindY, y1: kindY + hoehe,
          art: 'unterposten', labelSeite: 'rechts', anteil: anteil(u.betrag),
        };
        knoten.push(kind);
        fluesse.push({
          id: `f-${eltern.id}-${u.id}`, von: eltern.id, nach: u.id, wert: u.betrag,
          art: 'unterposten',
          pfad: bandPfad(eltern.x1, kind.x0, abgangKind, abgangKind + hoehe, kind.y0, kind.y1),
        });
        abgangKind += hoehe;
        kindY += hoehe + (faechern ? m.lueckeEnden : 0);
      }
      faecherY = kindY - (faechern ? m.lueckeEnden : 0);
    }
  }

  return { knoten, fluesse, breite: m.breite, hoehe: m.hoehe, summe, leer: false };
}
